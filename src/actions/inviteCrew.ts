'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export interface InviteResponse {
  success: boolean
  error?: string
  inviteLink?: string
  emailSent?: boolean
}

const InviteCrewSchema = z.object({
  email: z.string().email('Invalid email address.').max(254).toLowerCase().trim(),
})

const DeleteCrewSchema = z.object({
  crewMemberId: z.string().uuid('Invalid crew member ID.'),
})

export async function inviteCrew(email: string): Promise<InviteResponse> {
  try {
    const validated = InviteCrewSchema.safeParse({ email })
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || 'Validation error' }
    }
    const parsedEmail = validated.data.email

    const supabase = await createClient()

    // 1. Authenticate the current user
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    const supabaseAdmin = createAdminClient()

    // 2. Fetch the current user's profile and verify they are an 'owner' via admin client
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('id', currentUser.id)
      .single()

    if (profileErr || !profile) {
      return { success: false, error: 'Failed to retrieve profile metadata.' }
    }

    const allowedRoles = ['owner', 'manager', 'admin', 'captain']
    if (!allowedRoles.includes(profile.role)) {
      return { success: false, error: 'Unauthorized: Only organization owners, captains, or administrators can invite crew members.' }
    }

    if (!profile.org_id) {
      return { success: false, error: 'Your account is not associated with an organization.' }
    }

    const orgId = profile.org_id

    // 3. Attempt to invite user via email so Supabase sends it automatically
    let userId: string
    let inviteLink: string | undefined = undefined
    let emailSent = false

    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(parsedEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/crew/setup`,
      data: { role: 'crew' },
    })

    if (!inviteErr && inviteData?.user) {
      userId = inviteData.user.id
      emailSent = true
    } else {
      // If email sending is not configured (e.g., SMTP disabled locally), fallback to generateLink
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: parsedEmail,
        options: {
          data: { role: 'crew' },
        }
      })

      if (linkErr || !linkData?.user || !linkData?.properties?.hashed_token) {
        return {
          success: false,
          error: inviteErr?.message || linkErr?.message || 'Failed to generate invitation.',
        }
      }
      
      const tokenHash = linkData.properties.hashed_token
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      
      userId = linkData.user.id
      inviteLink = `${siteUrl}/invite?token_hash=${tokenHash}`
    }

    // 4. Pre-emptively insert/upsert a row in profiles table for the new user
    const { error: profileInsertErr } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        org_id: orgId,
        role: 'crew',
        full_name: 'Invited Crew Member', // placeholder until they accept
      })

    if (profileInsertErr) {
      console.error('Error inserting pre-emptive crew profile:', profileInsertErr)
      // Rollback newly created user to prevent orphaned records if insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return {
        success: false,
        error: `Failed to register user profile: ${profileInsertErr.message}`,
      }
    }

    revalidatePath('/dashboard/team')
    revalidatePath('/team')

    return {
      success: true,
      inviteLink,
      emailSent,
    }
  } catch (err: any) {
    console.error('Invite Crew Server Action error:', err)
    return {
      success: false,
      error: err.message || 'An unexpected error occurred.',
    }
  }
}

export async function deleteCrew(crewMemberId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = DeleteCrewSchema.safeParse({ crewMemberId })
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || 'Validation error' }
    }
    const parsedCrewMemberId = validated.data.crewMemberId

    const supabase = await createClient()

    // 1. Authenticate the current user
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    if (currentUser.id === parsedCrewMemberId) {
      return { success: false, error: 'You cannot delete yourself.' }
    }

    const supabaseAdmin = createAdminClient()

    // 2. Fetch the current user's profile
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('id', currentUser.id)
      .single()

    if (profileErr || !callerProfile) {
      return { success: false, error: 'Failed to retrieve profile metadata.' }
    }

    const allowedRoles = ['owner', 'manager', 'admin', 'captain']
    if (!allowedRoles.includes(callerProfile.role)) {
      return { success: false, error: 'Unauthorized: Only managers, captains, or owners can delete crew members.' }
    }

    if (!callerProfile.org_id) {
      return { success: false, error: 'Your account is not associated with an organization.' }
    }

    // 3. Fetch the target user's profile
    const { data: targetProfile, error: targetErr } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('id', parsedCrewMemberId)
      .single()

    if (targetErr || !targetProfile) {
      return { success: false, error: 'Target crew member not found.' }
    }

    // 4. Ensure same organization
    if (targetProfile.org_id !== callerProfile.org_id) {
      return { success: false, error: 'Access denied: User belongs to a different organization.' }
    }

    // 5. Hierarchy checks
    if (targetProfile.role === 'owner') {
      return { success: false, error: 'The organization owner cannot be deleted.' }
    }

    // Managers/Captains/Admins can only delete crew members
    if (callerProfile.role !== 'owner' && targetProfile.role !== 'crew') {
      return { success: false, error: 'Access denied: You are only authorized to delete crew members.' }
    }

    // 6. Unassign jobs
    const { error: jobsErr } = await supabaseAdmin
      .from('jobs')
      .update({ assigned_to: null })
      .eq('assigned_to', parsedCrewMemberId)

    if (jobsErr) {
      console.error('Error unassigning jobs:', jobsErr)
    }

    // 7. Delete profiles record
    const { error: deleteProfileErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', parsedCrewMemberId)

    if (deleteProfileErr) {
      return { success: false, error: `Failed to delete profile record: ${deleteProfileErr.message}` }
    }

    // 8. Delete user from auth
    const { error: deleteUserErr } = await supabaseAdmin.auth.admin.deleteUser(parsedCrewMemberId)

    if (deleteUserErr) {
      return { success: false, error: `Failed to delete user account: ${deleteUserErr.message}` }
    }

    revalidatePath('/dashboard/team')
    revalidatePath('/team')

    return { success: true }
  } catch (err: any) {
    console.error('Delete Crew Server Action error:', err)
    return { success: false, error: err.message || 'An unexpected error occurred.' }
  }
}
