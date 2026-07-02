'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email/resend'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export type InvitationActionResponse = {
  success: boolean
  error?: string
  invitation?: {
    email: string
    role: string
    company_name: string
  }
}

/**
 * Creates a pending invitation in the DB and dispatches a welcome email.
 * Note: Database column is organization_id, mapping to the owner's org_id.
 */
export async function createAndSendInvite(
  email: string,
  role: 'manager' | 'crew'
): Promise<InvitationActionResponse> {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !currentUser) {
      return { success: false, error: 'Unauthorized' }
    }

    // 2. Fetch profile and verify owner role
    const adminDb = createAdminClient()
    const { data: profile, error: profileErr } = await adminDb
      .from('profiles')
      .select('org_id, role')
      .eq('id', currentUser.id)
      .single()

    if (profileErr || !profile || profile.role !== 'owner') {
      return { success: false, error: 'Only organization owners can create invitations.' }
    }

    // Fetch organization name using owner's org_id
    const { data: orgData } = await adminDb
      .from('organizations')
      .select('name')
      .eq('id', profile.org_id)
      .single()

    const orgName = orgData?.name || 'their team'

    // 3. Generate a secure random token and expiration timestamp (7 days)
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // 4. Save to the invitations table (using organization_id mapping)
    const { error: insertErr } = await adminDb
      .from('invitations')
      .insert({
        email: email.trim().toLowerCase(),
        organization_id: profile.org_id,
        role,
        token,
        expires_at: expiresAt.toISOString(),
      })

    if (insertErr) {
      console.error('[Invitations Action] Database insert error:', insertErr)
      return { success: false, error: 'Failed to generate invitation.' }
    }

    // 5. Send onboarding email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://getcrewmark.com'
    const inviteLink = `${siteUrl}/invite/accept?token=${token}`

    try {
      await sendTransactionalEmail({
        to: email,
        subject: `Invitation: Join ${orgName} on Crewmark`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #0f172a;">
            <div style="margin-bottom: 28px;">
              <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.05em; color: #0f172a;">Crewmark</span>
            </div>
            
            <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700;">
              You've been invited to join ${orgName}
            </h2>
            
            <p style="color: #475569; font-size: 15px; line-height: 24px; margin-top: 0; margin-bottom: 24px;">
              You have been invited to join <strong>${orgName}</strong> as a <strong>${role === 'manager' ? 'Manager' : 'Crew Member'}</strong> on Crewmark. 
              ${role === 'manager' 
                ? "As a Manager, you'll be able to dispatch jobs, manage checklists, and coordinate the team." 
                : "As a Crew Member, you'll be able to view assigned jobs and submit checklist verification reports."
              }
            </p>
            
            <div style="margin-bottom: 28px;">
              <a href="${inviteLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; border-radius: 6px; font-size: 14px; text-align: center;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 13px; line-height: 20px; margin-bottom: 28px;">
              This invitation will expire in 7 days. If the button above does not work, copy and paste this link into your browser:<br />
              <a href="${inviteLink}" style="color: #0f172a; text-decoration: underline;">${inviteLink}</a>
            </p>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 36px 0;" />
            
            <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
              This email was sent to ${email}. If you did not expect this request, you can safely ignore this message.
            </p>
          </div>
        `
      })
    } catch (emailErr) {
      console.error('[Invitations Action] Email delivery failed:', emailErr)
      return { success: true, error: 'Invitation created but email delivery failed.' }
    }

    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (err: any) {
    console.error('[Invitations Action] Unexpected error:', err)
    return { success: false, error: err.message || 'An unexpected error occurred.' }
  }
}

/**
 * Validates a pending invitation token.
 */
export async function getInvitationByToken(token: string): Promise<InvitationActionResponse> {
  try {
    const adminDb = createAdminClient()
    const { data: invitation, error } = await adminDb
      .from('invitations')
      .select('email, role, organization_id, expires_at, organizations(name)')
      .eq('token', token)
      .single()

    if (error || !invitation) {
      return { success: false, error: 'Invalid or expired invitation token.' }
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return { success: false, error: 'This invitation has expired.' }
    }

    const org = invitation.organizations as any

    return {
      success: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        company_name: org?.name || 'their team',
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Verification failed.' }
  }
}
