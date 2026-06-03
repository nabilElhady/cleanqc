'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type FormState = {
  success?: boolean
  error?: string
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

  // Resolve role and superadmin state from user profile
  const { data: profile } = await supabase
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

  // 2. Create the Organization
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: orgName.trim() })
    .select('id')
    .single()

  if (orgError || !orgData) {
    return { error: orgError?.message || 'Failed to create organization.' }
  }

  const orgId = orgData.id

  // 3. Create/Update Profile with RLS considerations
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  if (existingProfile) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        org_id: orgId,
        role: 'owner',
        full_name: name.trim(),
      })
      .eq('id', userId)

    if (updateError) {
      return { error: updateError.message }
    }
  } else {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        org_id: orgId,
        role: 'owner',
        full_name: name.trim(),
      })

    if (insertError) {
      return { error: insertError.message }
    }
  }

  // Redirect to redirect parameter or default dashboard
  if (redirectTo && redirectTo.startsWith('/')) {
    redirect(redirectTo)
  } else {
    redirect('/dashboard')
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
