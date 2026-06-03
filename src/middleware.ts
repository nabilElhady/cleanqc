import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Service-role client for internal DB reads (bypasses RLS) — safe, server-only
function createAdminClient() {
  return createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Cookie-based anon client — used ONLY for auth.getUser()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }))
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
      // Use admin client — bypasses RLS so org_id/role are never null
      const db = createAdminClient()
      const { data: profile } = await db
        .from('profiles')
        .select('org_id, role, is_superadmin')
        .eq('id', user.id)
        .single()

      let isPremiumActive = false

      if (profile?.is_superadmin === true || profile?.role === 'owner') {
        isPremiumActive = true
      } else if (profile?.org_id) {
        const { data: org } = await db
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

  // Redirect authenticated user away from login page to their specific dashboard
  if (request.nextUrl.pathname.startsWith('/login')) {
    if (user) {
      // Use admin client for reliable role read
      const db = createAdminClient()
      const { data: profile } = await db
        .from('profiles')
        .select('role, is_superadmin')
        .eq('id', user.id)
        .single()

      const url = request.nextUrl.clone()
      if (profile?.is_superadmin === true) {
        url.pathname = '/admin'
      } else if (profile?.role === 'crew') {
        url.pathname = '/crew/jobs'
      } else {
        url.pathname = '/dashboard'
      }
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
