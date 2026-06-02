import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  // Clone URL for safe redirection within the same origin
  const redirectTo = request.nextUrl.clone()
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  redirectTo.searchParams.delete('next')

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      // Fetch authenticated user to check role
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Query user's role from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'crew') {
          redirectTo.pathname = '/crew/jobs'
        } else {
          redirectTo.pathname = '/dashboard'
        }
      } else {
        redirectTo.pathname = next
      }

      return NextResponse.redirect(redirectTo)
    }
  }

  // Return to login with error state if verification fails
  redirectTo.pathname = '/login'
  redirectTo.searchParams.set('error', 'Invalid Link')
  return NextResponse.redirect(redirectTo)
}

