'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { z } from 'zod'
import { sendTransactionalEmail } from '@/lib/email/resend'

export type FormState = {
  success?: boolean
  error?: string
  needsConfirmation?: boolean
}

// ==========================================
// 1. STRICT ZOD VALIDATION SCHEMAS
// ==========================================

const SignInSchema = z.object({
  email: z.string().email('Invalid email address.').max(254).toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(128),
  redirect: z.string().max(200).optional().or(z.literal('')),
})

const SignUpSchema = z.object({
  name: z.string().min(1, 'Full Name is required.').max(100).trim(),
  email: z.string().email('Invalid email address.').max(254).toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
  orgName: z.string().min(1, 'Organization Name is required.').max(100).trim(),
  redirect: z.string().max(200).optional().or(z.literal('')),
})

// Helper to prevent Open Redirect vulnerabilities
function getSafeRedirect(path: string | undefined | null): string {
  if (!path) return '/dashboard'
  // Permits alphanumeric paths, dashes, underscores, and forward slashes (no domains or absolute URLs allowed)
  const isSafe = /^\/[a-zA-Z0-9\-_\/]*$/.test(path)
  return isSafe ? path : '/dashboard'
}

// ==========================================
// 2. HARDENED SERVER ACTIONS
// ==========================================

/**
 * Handles standard Email & Password sign-in.
 */
export async function signInWithPassword(
  prevState: FormState | FormData,
  formData?: FormData
): Promise<FormState> {
  let actualFormData: FormData | undefined

  if (prevState instanceof FormData) {
    actualFormData = prevState
  } else if (formData instanceof FormData) {
    actualFormData = formData
  }

  if (!actualFormData) {
    return { error: 'Invalid form submission.' }
  }

  const rawFields = Object.fromEntries(actualFormData.entries())
  const validatedFields = SignInSchema.safeParse(rawFields)

  if (!validatedFields.success) {
    const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
      .flat()
      .join(' ')
    return { error: errorMsg }
  }

  const { email, password, redirect: redirectTo } = validatedFields.data

  const supabase = await createClient()

  // Sign in using Supabase email & password
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !authData.user) {
    return { error: error?.message || 'Invalid email or password.' }
  }

  // Use admin client so RLS never blocks reading role/is_superadmin
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('role, is_superadmin')
    .eq('id', authData.user.id)
    .single()

  const userRole = profile?.role
  const isSuperadmin = profile?.is_superadmin === true

  // Perform role-based server-side redirect
  if (redirectTo) {
    const destination = getSafeRedirect(redirectTo)
    redirect(destination)
  } else if (isSuperadmin) {
    redirect('/admin')
  } else if (userRole === 'crew') {
    redirect('/crew/jobs')
  } else {
    redirect('/dashboard')
  }
}

/**
 * Handles new Owner & Organization Sign Up.
 */
export async function signUpWithOwner(
  prevState: FormState | FormData,
  formData?: FormData
): Promise<FormState> {
  let actualFormData: FormData | undefined

  if (prevState instanceof FormData) {
    actualFormData = prevState
  } else if (formData instanceof FormData) {
    actualFormData = formData
  }

  if (!actualFormData) {
    return { error: 'Invalid form submission.' }
  }

  const rawFields = Object.fromEntries(actualFormData.entries())
  const validatedFields = SignUpSchema.safeParse(rawFields)

  if (!validatedFields.success) {
    const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
      .flat()
      .join(' ')
    return { error: errorMsg }
  }

  const { name, email, password, orgName, redirect: redirectTo } = validatedFields.data

  try {
    const supabase = await createClient()
    const headersList = await headers()
    
    // Fix: Eradicate host header injection by relying strictly on ENV configuration
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cleanqc.vercel.app'
    const confirmUrl = `${siteUrl}/auth/confirm`

    // 1. Sign up user in Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: confirmUrl,
        data: {
          full_name: name,
        },
      },
    })

    if (signUpError || !authData.user) {
      return { error: signUpError?.message || 'Failed to sign up.' }
    }

    const userId = authData.user.id

    // Use the admin client to bypass RLS during registration setup
    const adminDb = createAdminClient()

    // Grab the user's IP from Vercel/Next headers and record trial tracking (trial abuse prevention)
    try {
      const userIp = headersList.get('x-forwarded-for') || 'unknown'
      await adminDb.from('trial_tracking').insert({
        user_id: userId,
        ip_address: userIp
      })
    } catch (ipErr) {
      console.error('Failed to log trial tracking IP:', ipErr)
    }

    const baseSlug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const slug = `${baseSlug || 'org'}-${Math.random().toString(36).substring(2, 8)}`

    // 2. Create the Organization (Fix: select only the 'id' column)
    const { data: orgData, error: orgError } = await adminDb
      .from('organizations')
      .insert({ 
        name: orgName,
        slug
      })
      .select('id')
      .single()

    if (orgError || !orgData) {
      // Rollback Auth user to prevent orphaned auth record
      await adminDb.auth.admin.deleteUser(userId)
      return { error: orgError?.message || 'Failed to create organization.' }
    }

    const orgId = orgData.id

    // 3. Create/Update Profile (Fix: Consolidate verification into a single atomic upsert)
    const { error: upsertError } = await adminDb
      .from('profiles')
      .upsert({
        id: userId,
        org_id: orgId,
        role: 'owner',
        full_name: name,
      }, { onConflict: 'id' })

    if (upsertError) {
      // Rollback org and auth user
      await adminDb.from('organizations').delete().eq('id', orgId)
      await adminDb.auth.admin.deleteUser(userId)
      return { error: upsertError.message }
    }

    // Send transactional welcome email
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://getcrewmark.com'
      
      await sendTransactionalEmail({
        to: email,
        subject: 'Welcome to Crewmark!',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #0f172a;">
            <div style="margin-bottom: 28px;">
              <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.05em; color: #0f172a;">Crewmark</span>
            </div>
            
            <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 22px; font-weight: 800; tracking: -0.025em;">
              Let's get dispatching, ${name}!
            </h2>
            
            <p style="color: #475569; font-size: 15px; line-height: 24px; margin-top: 0; margin-bottom: 20px;">
              Thanks for creating a Crewmark account. Your organization, <strong>${orgName}</strong>, is now active and ready for operations.
            </p>

            <p style="color: #475569; font-size: 15px; line-height: 24px; margin-bottom: 24px;">
              Here are the first three things you can do to get your commercial cleaning dispatching running smoothly:
            </p>

            <div style="margin-bottom: 28px;">
              <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 4px 0; color: #0f172a; font-size: 14px; font-weight: 700;">1. Create Checklists</h4>
                <p style="margin: 0; color: #475569; font-size: 13.5px; line-height: 20px;">
                  Build detailed cleaning templates with custom checklist tasks, instruction fields, and mandatory photo verification targets.
                </p>
              </div>
              
              <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 4px 0; color: #0f172a; font-size: 14px; font-weight: 700;">2. Invite Your Crew</h4>
                <p style="margin: 0; color: #475569; font-size: 13.5px; line-height: 20px;">
                  Add crew members to your organization settings so they can log in via their mobile app, view scheduled jobs, and submit checklists.
                </p>
              </div>

              <div>
                <h4 style="margin: 0 0 4px 0; color: #0f172a; font-size: 14px; font-weight: 700;">3. Dispatch Jobs</h4>
                <p style="margin: 0; color: #475569; font-size: 13.5px; line-height: 20px;">
                  Schedule and dispatch cleaning sessions directly to your crew. Get real-time updates and proof-of-work compliance reports instantly.
                </p>
              </div>
            </div>
            
            <a href="${siteUrl}/dashboard" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; border-radius: 6px; font-size: 14px; text-align: center;">
              Go to Your Dashboard
            </a>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 36px 0;" />
            
            <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
              Have questions or need help setting up your team? Reach out to us anytime at <a href="mailto:support@getcrewmark.com" style="color: #0f172a; text-decoration: underline;">support@getcrewmark.com</a>.
            </p>
          </div>
        `
      })
    } catch (emailErr) {
      console.error('[signUpWithOwner] Welcome email dispatch failed:', emailErr)
    }

    // If email confirmation is enabled, session will be null and the user must verify their email first
    if (!authData.session) {
      return { success: true, needsConfirmation: true }
    }

    // Redirect to redirect parameter or default dashboard
    const destination = getSafeRedirect(redirectTo)
    redirect(destination)
  } catch (err: any) {
    console.error('Signup error:', err)
    return { error: err.message || 'An unexpected error occurred during signup.' }
  }
}

/**
 * Signs the current user out and redirects to the login page.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete('crew_session_token')
  redirect('/login')
}

/**
 * Validates a crew member passcode and starts a secure stateless crew session.
 */
export async function authenticateCrewMember(passcode: string) {
  const adminDb = createAdminClient()

  // 1. Look up the profile matching this unique code
  const { data: profile, error } = await adminDb
    .from('profiles')
    .select('id, full_name, role')
    .eq('crew_passcode', passcode.trim())
    .maybeSingle()
    
  if (error || !profile) {
    return { success: false, error: 'Invalid access code. Please check with your manager.' }
  }

  if (profile.role !== 'crew') {
    return { success: false, error: 'Access denied. Code only valid for crew members.' }
  }
  
  // 2. Set a secure HTTP-only crew token session cookie valid for 30 days
  const cookieStore = await cookies()
  cookieStore.set('crew_session_token', profile.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30 
  })
  
  redirect('/crew/jobs')
}

/**
 * Initiates Google OAuth sign-in via Supabase.
 * Returns the provider URL for the client to redirect to.
 * Using a redirect() inside a Server Action in a try/catch causes issues,
 * so we return the URL and let the client handle the redirect.
 */
export async function signInWithGoogle(next?: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()

  // Build the absolute callback URL dynamically for both local and production
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://getcrewmark.com')

  const callbackUrl = new URL('/auth/callback', siteUrl)
  if (next) {
    callbackUrl.searchParams.set('next', next)
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        // Force account selection prompt on every sign-in (prevents auto-selection surprises)
        prompt: 'select_account',
      },
    },
  })

  if (error || !data.url) {
    console.error('[signInWithGoogle] OAuth initiation failed:', error?.message)
    return { error: error?.message || 'Failed to initiate Google sign-in.' }
  }

  return { url: data.url }
}

/**
 * Completes the onboarding process for new users who signed up via Google OAuth.
 * Creates an organization and assigns the user as the owner.
 */
export async function completeGoogleOnboarding(
  prevState: FormState | FormData,
  formData?: FormData
): Promise<FormState> {
  let actualFormData: FormData | undefined

  if (prevState instanceof FormData) {
    actualFormData = prevState
  } else if (formData instanceof FormData) {
    actualFormData = formData
  }

  if (!actualFormData) {
    return { error: 'Invalid form submission.' }
  }

  const orgName = actualFormData.get('orgName')?.toString().trim()
  if (!orgName) {
    return { error: 'Organization name is required.' }
  }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: 'Not authenticated.' }
  }

  const userId = authData.user.id
  const adminDb = createAdminClient()

  // Verify the user doesn't already have an org
  const { data: profile } = await adminDb
    .from('profiles')
    .select('org_id')
    .eq('id', userId)
    .single()

  if (profile?.org_id) {
    redirect('/dashboard')
  }

  const baseSlug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const slug = `${baseSlug || 'org'}-${Math.random().toString(36).substring(2, 8)}`

  // Create the Organization
  const { data: orgData, error: orgError } = await adminDb
    .from('organizations')
    .insert({ 
      name: orgName,
      slug
    })
    .select('id')
    .single()

  if (orgError || !orgData) {
    return { error: orgError?.message || 'Failed to create organization.' }
  }

  const orgId = orgData.id

  // Update Profile
  const { error: upsertError } = await adminDb
    .from('profiles')
    .update({
      org_id: orgId,
      role: 'owner',
    })
    .eq('id', userId)

  if (upsertError) {
    // Rollback org
    await adminDb.from('organizations').delete().eq('id', orgId)
    return { error: upsertError.message }
  }

  redirect('/dashboard')
}
