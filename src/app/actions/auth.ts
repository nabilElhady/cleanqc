'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'

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
  redirect('/login')
}
