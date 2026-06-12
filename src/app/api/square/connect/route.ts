export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function GET(request: Request) {
  const supabase = await createClient()
  
  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const applicationId = process.env.SQUARE_APPLICATION_ID
  const environment = process.env.SQUARE_ENVIRONMENT || 'sandbox'
  
  if (!applicationId) {
    console.error('Missing SQUARE_APPLICATION_ID')
    return new NextResponse('Server Configuration Error', { status: 500 })
  }

  // Generate a random state token for CSRF protection
  const state = crypto.randomBytes(32).toString('hex')
  
  // Store the state in an HttpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set('square_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  })

  const baseUrl = environment === 'production' 
    ? 'https://connect.squareup.com' 
    : 'https://connect.squareupsandbox.com'

  const scopes = [
    'CUSTOMERS_WRITE',
    'CUSTOMERS_READ',
    'INVOICES_WRITE',
    'INVOICES_READ',
    'ORDERS_WRITE',
    'ORDERS_READ',
    'MERCHANT_PROFILE_READ'
  ].join('+')

  const authorizeUrl = `${baseUrl}/oauth2/authorize?client_id=${applicationId}&response_type=code&scope=${scopes}&state=${state}`

  return NextResponse.redirect(authorizeUrl)
}
