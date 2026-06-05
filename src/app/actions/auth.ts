'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export type FormState = {
  success?: boolean
  error?: string
  needsConfirmation?: boolean
}

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

  const email = actualFormData.get('email') as string
  const password = actualFormData.get('password') as string
  const redirectTo = actualFormData.get('redirect') as string

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' }
  }

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }

  const supabase = await createClient()

  // Sign in using Supabase email & password
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
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
  if (redirectTo && redirectTo.startsWith('/')) {
    redirect(redirectTo)
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

  const name = actualFormData.get('name') as string
  const email = actualFormData.get('email') as string
  const password = actualFormData.get('password') as string
  const orgName = actualFormData.get('orgName') as string
  const redirectTo = actualFormData.get('redirect') as string

  if (!name || name.trim().length === 0) {
    return { error: 'Full Name is required.' }
  }
  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' }
  }
  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }
  if (!orgName || orgName.trim().length === 0) {
    return { error: 'Organization Name is required.' }
  }

  try {
    const supabase = await createClient()

    // 1. Sign up user in Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    })

    if (signUpError || !authData.user) {
      return { error: signUpError?.message || 'Failed to sign up.' }
    }

    const userId = authData.user.id

    // Use the admin client to bypass RLS during registration setup
    const adminDb = createAdminClient()

    const baseSlug = orgName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const slug = `${baseSlug || 'org'}-${Math.random().toString(36).substring(2, 8)}`

    // 2. Create the Organization
    const { data: orgData, error: orgError } = await adminDb
      .from('organizations')
      .insert({ 
        name: orgName.trim(),
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

    // 3. Create/Update Profile
    const { data: existingProfile } = await adminDb
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      const { error: updateError } = await adminDb
        .from('profiles')
        .update({
          org_id: orgId,
          role: 'owner',
          full_name: name.trim(),
        })
        .eq('id', userId)

      if (updateError) {
        // Rollback org and auth user
        await adminDb.from('organizations').delete().eq('id', orgId)
        await adminDb.auth.admin.deleteUser(userId)
        return { error: updateError.message }
      }
    } else {
      const { error: insertError } = await adminDb
        .from('profiles')
        .insert({
          id: userId,
          org_id: orgId,
          role: 'owner',
          full_name: name.trim(),
        })

      if (insertError) {
        // Rollback org and auth user
        await adminDb.from('organizations').delete().eq('id', orgId)
        await adminDb.auth.admin.deleteUser(userId)
        return { error: insertError.message }
      }
    }

    // If email confirmation is enabled, session will be null and the user must verify their email first
    if (!authData.session) {
      return { success: true, needsConfirmation: true }
    }

    // Redirect to redirect parameter or default dashboard
    if (redirectTo && redirectTo.startsWith('/')) {
      redirect(redirectTo)
    } else {
      redirect('/dashboard')
    }
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
