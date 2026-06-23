'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from './templates'
import { assertPremiumServer } from '@/lib/subscription'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { sendTransactionalEmail } from '@/lib/email/resend'

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const InviteUserSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100).trim(),
  email: z.string().email('Invalid email address.').max(254).toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(128).optional().or(z.literal('')),
})

const DeleteCrewSchema = z.object({
  crewMemberId: z.string().uuid('Invalid crew member ID.'),
})

/**
 * Helper to check seat limits for a given organization and role.
 */
async function checkSeatLimits(orgId: string, roleToAdd: 'crew' | 'manager', supabaseAdmin: any): Promise<{ allowed: boolean; error?: string }> {
  // 1. Get organization tier
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('subscription_tier')
    .eq('id', orgId)
    .single()

  const tier = org?.subscription_tier || 'starter' // default to starter

  // 2. Count existing users by role
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('org_id', orgId)

  if (error || !profiles) {
    return { allowed: false, error: 'Could not fetch current organization usage.' }
  }

  const crewCount = profiles.filter((p: any) => p.role === 'crew').length
  const managerCount = profiles.filter((p: any) => p.role === 'manager' || p.role === 'owner').length

  // 3. Apply Limits
  if (tier === 'starter') {
    if (roleToAdd === 'crew' && crewCount >= 5) return { allowed: false, error: 'Starter tier is limited to 5 Crew members.' }
    if (roleToAdd === 'manager' && managerCount >= 1) return { allowed: false, error: 'Starter tier is limited to 1 Manager (Owner).' }
  } else if (tier === 'growth') {
    if (roleToAdd === 'crew' && crewCount >= 20) return { allowed: false, error: 'Growth tier is limited to 20 Crew members.' }
    if (roleToAdd === 'manager' && managerCount >= 3) return { allowed: false, error: 'Growth tier is limited to 3 Managers.' }
  }
  // scale tier is unlimited

  return { allowed: true }
}

/**
 * Creates a new crew member user and registers their profile with the manager's organization.
 */
export async function inviteCrewMember(
  name: string,
  email: string,
  password?: string
): Promise<ActionResponse> {
  try {
    await assertPremiumServer()

    const validatedFields = InviteUserSchema.safeParse({ name, email, password })
    if (!validatedFields.success) {
      const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ')
      return { success: false, error: errorMsg }
    }

    const { name: parsedName, email: parsedEmail, password: parsedPassword } = validatedFields.data

    const supabase = await createClient()
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return { success: false, error: 'Unauthorized' }
    }

    // Resolve manager profile to get their organization ID and role via admin client
    const supabaseAdmin = createAdminClient()
    const { data: managerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('id', currentUser.id)
      .single()

    if (profileError || !managerProfile?.org_id) {
      return { success: false, error: 'Could not retrieve organization ID.' }
    }

    if (managerProfile.role !== 'owner' && managerProfile.role !== 'manager') {
      return { success: false, error: 'Only managers can invite crew members.' }
    }

    // Check Seat Limits before proceeding
    const limitCheck = await checkSeatLimits(managerProfile.org_id, 'crew', supabaseAdmin)
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.error, requiresUpgrade: true }
    }

    // Generate secure temporary fallback password if none is provided
    const tempPassword = parsedPassword || randomBytes(16).toString('hex')

    // 1. Create the user in Auth with confirmed email and password
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: parsedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: parsedName },
    })

    if (createUserError || !authUser.user) {
      return {
        success: false,
        error: createUserError?.message || 'Failed to create authenticated user.',
      }
    }

    // 2. Insert corresponding profile record
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        org_id: managerProfile.org_id,
        role: 'crew',
        full_name: parsedName,
      })

    if (insertError) {
      // Rollback: Delete newly created auth user to prevent orphaned identities
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return { success: false, error: insertError.message }
    }

    revalidatePath('/team')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' }
  }
}

/**
 * Creates a new manager user and registers their profile with the organization.
 * Only owners can invite other managers.
 */
export async function inviteManager(
  name: string,
  email: string,
  password?: string
): Promise<ActionResponse> {
  try {
    await assertPremiumServer()

    const validatedFields = InviteUserSchema.safeParse({ name, email, password })
    if (!validatedFields.success) {
      const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ')
      return { success: false, error: errorMsg }
    }

    const { name: parsedName, email: parsedEmail, password: parsedPassword } = validatedFields.data

    const supabase = await createClient()
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !currentUser) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = createAdminClient()
    const { data: managerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('id', currentUser.id)
      .single()

    if (profileError || !managerProfile?.org_id) return { success: false, error: 'Could not retrieve organization ID.' }

    if (managerProfile.role !== 'owner') {
      return { success: false, error: 'Only owners can invite other managers.' }
    }

    // Check Seat Limits before proceeding
    const limitCheck = await checkSeatLimits(managerProfile.org_id, 'manager', supabaseAdmin)
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.error, requiresUpgrade: true }
    }

    const tempPassword = parsedPassword || randomBytes(16).toString('hex')

    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: parsedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: parsedName },
    })

    if (createUserError || !authUser.user) {
      return { success: false, error: createUserError?.message || 'Failed to create authenticated user.' }
    }

    // Fetch organization name for a premium, personalized email welcome
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', managerProfile.org_id)
      .single()

    const orgName = orgData?.name || 'their team'

    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        org_id: managerProfile.org_id,
        role: 'manager',
        full_name: parsedName,
      })

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return { success: false, error: insertError.message }
    }

    // Send transactional invitation email with direct login details
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://getcrewmark.com'
      const loginLink = `${siteUrl}/login`
      
      await sendTransactionalEmail({
        to: parsedEmail,
        subject: `Invitation: Manage ${orgName} on Crewmark`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #0f172a;">
            <div style="margin-bottom: 28px;">
              <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.05em; color: #0f172a;">Crewmark</span>
            </div>
            
            <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700; tracking: -0.02em;">
              You have been invited to manage ${orgName}
            </h2>
            
            <p style="color: #475569; font-size: 15px; line-height: 24px; margin-top: 0; margin-bottom: 24px;">
              Hello ${parsedName},<br />
              The owner of <strong>${orgName}</strong> has invited you to join their team as a <strong>Manager</strong> on Crewmark. You'll be able to dispatch jobs, manage checklists, and coordinate crew members.
            </p>
            
            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
              <h3 style="color: #334155; margin-top: 0; margin-bottom: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</h3>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;"><strong>Email:</strong> ${parsedEmail}</p>
              <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 3px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #0f172a;">${tempPassword}</code></p>
            </div>
            
            <p style="color: #475569; font-size: 14px; line-height: 20px; margin-bottom: 28px;">
              For security, please log in using the button below and update your password in your settings tab right away.
            </p>
            
            <a href="${loginLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; border-radius: 6px; font-size: 14px; text-align: center; transition: background-color 0.2s;">
              Accept Invitation & Sign In
            </a>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 36px 0;" />
            
            <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
              This invitation was sent to ${parsedEmail} on behalf of ${orgName}. If you were not expecting this request, you can safely ignore this message.
            </p>
          </div>
        `
      })
    } catch (emailErr) {
      console.error('[inviteManager] Welcome email dispatch failed:', emailErr)
    }

    revalidatePath('/team')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' }
  }
}

/**
 * Deletes a crew member from the organization, unassigning them from any jobs.
 */
export async function deleteCrewMember(crewMemberId: string): Promise<ActionResponse> {
  try {
    await assertPremiumServer()

    const validatedFields = DeleteCrewSchema.safeParse({ crewMemberId })
    if (!validatedFields.success) {
      const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ')
      return { success: false, error: errorMsg }
    }

    const { crewMemberId: parsedCrewMemberId } = validatedFields.data

    const supabase = await createClient()
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return { success: false, error: 'Unauthorized' }
    }

    if (currentUser.id === parsedCrewMemberId) {
      return { success: false, error: 'You cannot delete yourself.' }
    }

    const supabaseAdmin = createAdminClient()

    // Resolve caller's profile to get organization context and verify they are owner/manager
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('id', currentUser.id)
      .single()

    if (profileError || !callerProfile?.org_id) {
      return { success: false, error: 'Could not retrieve organization ID.' }
    }

    const allowedCallerRoles = ['owner', 'manager', 'admin', 'captain']
    if (!allowedCallerRoles.includes(callerProfile.role)) {
      return { success: false, error: 'Only administrators, captains, or owners can delete team members.' }
    }

    // Verify target profile is in the same organization
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('id', parsedCrewMemberId)
      .single()

    if (targetError || !targetProfile) {
      return { success: false, error: 'Crew member not found.' }
    }

    if (targetProfile.org_id !== callerProfile.org_id) {
      return { success: false, error: 'Access denied. Member belongs to a different organization.' }
    }

    // Prevent deleting the owner
    if (targetProfile.role === 'owner') {
      return { success: false, error: 'The organization owner cannot be deleted.' }
    }

    // Managers/captains/admins can only delete crew members (they cannot delete other managers/captains/admins)
    if (callerProfile.role !== 'owner' && targetProfile.role !== 'crew') {
      return { success: false, error: 'Access denied. You are only authorized to delete crew members.' }
    }

    // 1. Unassign the crew member from any jobs in this organization
    const { error: updateJobsError } = await supabaseAdmin
      .from('jobs')
      .update({ assigned_to: null })
      .eq('assigned_to', parsedCrewMemberId)
      .eq('org_id', callerProfile.org_id)

    if (updateJobsError) {
      return { success: false, error: `Failed to unassign jobs: ${updateJobsError.message}` }
    }

    // 2. Delete the profile record
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', parsedCrewMemberId)

    if (deleteProfileError) {
      return { success: false, error: `Failed to delete profile record: ${deleteProfileError.message}` }
    }

    // 3. Delete the auth user
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(parsedCrewMemberId)

    if (deleteUserError) {
      return { success: false, error: `Failed to delete user account: ${deleteUserError.message}` }
    }

    revalidatePath('/team')
    revalidatePath('/jobs')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' }
  }
}
