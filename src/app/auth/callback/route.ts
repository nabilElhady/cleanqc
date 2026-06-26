import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * OAuth Callback Route Handler
 *
 * Supabase redirects the user here after Google OAuth completes.
 * This handler exchanges the temporary `code` for a real session,
 * writes the session cookies server-side, then redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Optional: carry a `next` param through the OAuth flow for post-login redirect
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    // No code means the OAuth flow was rejected/cancelled
    return NextResponse.redirect(`${origin}/login?error=OAuth+flow+was+cancelled`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] Code exchange failed:', error?.message)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error?.message || 'Failed')}`
    )
  }

  // Check if the user has an organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', data.user.id)
    .single()

  // Determine the correct redirect destination (safe path only)
  const isSafePath = /^\/[a-zA-Z0-9\-_\/]*$/.test(next)
  let safeRedirect = isSafePath ? next : '/dashboard'

  if (!profile?.org_id) {
    safeRedirect = '/onboarding'
  }

  // Use the forwarded host header in production to support custom domains
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${safeRedirect}`)
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${safeRedirect}`)
  } else {
    return NextResponse.redirect(`${origin}${safeRedirect}`)
  }
}
