import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const protectedPaths = ['/dashboard', '/templates', '/jobs', '/team']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // 1. Protect routes requiring authentication
  if (isProtectedPath) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
      return NextResponse.redirect(url)
    }

    // 2. Gate premium features: templates, jobs, team
    const premiumPaths = ['/templates', '/jobs', '/team']
    const isPremiumPath = premiumPaths.some(path => request.nextUrl.pathname.startsWith(path))

    if (isPremiumPath) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()

      let isPremiumActive = false

      if (profile?.org_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('subscription_status')
          .eq('id', profile.org_id)
          .single()

        if (org?.subscription_status === 'active' || org?.subscription_status === 'trialing') {
          isPremiumActive = true
        }
      }

      if (!isPremiumActive) {
        const url = request.nextUrl.clone()
        url.pathname = '/pricing'
        url.searchParams.set('error', 'This feature requires an active premium subscription.')
        return NextResponse.redirect(url)
      }
    }
  }

  // Redirect authenticated user away from login page
  if (request.nextUrl.pathname.startsWith('/login')) {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - any image file types
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
