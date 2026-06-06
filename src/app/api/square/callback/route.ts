import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { SquareClient, SquareEnvironment } from 'square'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  if (error) {
    console.error('Square OAuth Error:', error, errorDescription)
    return NextResponse.redirect(new URL('/dashboard/settings?square_error=access_denied', request.url))
  }

  // Verify CSRF state
  const cookieStore = await cookies()
  const savedState = cookieStore.get('square_oauth_state')?.value
  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL('/dashboard/settings?square_error=invalid_state', request.url))
  }

  // Clear the state cookie
  cookieStore.delete('square_oauth_state')

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/settings?square_error=missing_code', request.url))
  }

  // Authenticate user to link token to their org
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login?redirect=/dashboard/settings', request.url))
  }

  // Get user's org
  const { data: role } = await supabase
    .from('user_roles')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!role?.org_id) {
    return NextResponse.redirect(new URL('/dashboard/settings?square_error=no_org', request.url))
  }

  const applicationId = process.env.SQUARE_APPLICATION_ID!
  const applicationSecret = process.env.SQUARE_APPLICATION_SECRET!
  const env = process.env.SQUARE_ENVIRONMENT || 'sandbox'

  // No access token needed for OAuth token exchange — unauthenticated client
  const squareClient = new SquareClient({
    environment: env === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  })

  try {
    // Exchange the authorization code for tokens using the v44 SDK's oAuth resource
    const response = await squareClient.oAuth.obtainToken({
      clientId: applicationId,
      clientSecret: applicationSecret,
      grantType: 'authorization_code',
      code,
    })

    const accessToken = response.accessToken
    const refreshToken = response.refreshToken
    const merchantId = response.merchantId
    const expiresAt = response.expiresAt

    if (!accessToken || !refreshToken) {
      throw new Error('Missing tokens in Square response')
    }

    // Calculate expiry date
    const expiryDate = expiresAt
      ? new Date(expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30-day fallback

    // Save tokens securely to the database
    const { error: dbError } = await supabase
      .from('organizations')
      .update({
        square_access_token: accessToken,
        square_refresh_token: refreshToken,
        square_merchant_id: merchantId,
        square_token_expires_at: expiryDate.toISOString(),
      })
      .eq('id', role.org_id)

    if (dbError) {
      console.error('Supabase update error:', dbError)
      throw new Error('Failed to save tokens')
    }

    return NextResponse.redirect(new URL('/dashboard/settings?square_success=true', request.url))

  } catch (err) {
    console.error('Square token exchange error:', err)
    return NextResponse.redirect(new URL('/dashboard/settings?square_error=exchange_failed', request.url))
  }
}
