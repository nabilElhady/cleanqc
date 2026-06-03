import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Paddle, Environment } from '@paddle/paddle-node-sdk'

// Force dynamic execution for API routes that read cookies/sessions
export const dynamic = 'force-dynamic'

const paddleApiKey = process.env.PADDLE_API_KEY
const paddlePriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID
const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox'

// Initialize Paddle Node SDK Client
const paddle = new Paddle(paddleApiKey || '', {
  environment: paddleEnv === 'production' ? Environment.production : Environment.sandbox,
})

async function getCheckoutData() {
  if (!paddleApiKey) {
    return { error: 'Paddle API Key not configured on the server.', status: 500 }
  }

  if (!paddlePriceId) {
    return { error: 'Paddle Price ID not configured on the server.', status: 500 }
  }

  const supabase = await createClient()

  // Get user session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized. Please log in first.', status: 401 }
  }

  // Fetch profile to verify role and get org_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.org_id) {
    return { error: 'User profile or associated organization not found.', status: 404 }
  }

  // Check if role is 'owner'
  if (profile.role !== 'owner') {
    return { error: 'Forbidden. Only organization owners can manage subscriptions.', status: 403 }
  }

  try {
    // Create the transaction
    const transaction = await paddle.transactions.create({
      items: [
        {
          priceId: paddlePriceId,
          quantity: 1,
        },
      ],
      customData: {
        supabase_user_id: user.id,
        orgId: profile.org_id,
        // Include email here to ensure it's recorded on the custom data of the transaction
        customerNotificationEmail: user.email || '',
      },
    })

    let checkoutUrl = transaction.checkout?.url || (transaction as any).hostedCheckoutUrl || ''

    if (!checkoutUrl) {
      return { error: 'Failed to retrieve checkout URL from Paddle.', status: 500 }
    }

    // Append customer email as query parameter to prefill the checkout form
    if (user.email) {
      const separator = checkoutUrl.includes('?') ? '&' : '?'
      checkoutUrl = `${checkoutUrl}${separator}customer_email=${encodeURIComponent(user.email)}`
    }

    return { checkoutUrl, status: 200 }
  } catch (err: any) {
    console.error('Paddle transaction creation error:', err)
    return { error: err.message || 'Error generating Paddle transaction.', status: 500 }
  }
}

export async function POST() {
  const result = await getCheckoutData()

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ checkoutUrl: result.checkoutUrl })
}

export async function GET() {
  const result = await getCheckoutData()

  if (result.error) {
    // Redirect back to pricing page with error query param
    return NextResponse.redirect(
      new URL(`/pricing?error=${encodeURIComponent(result.error)}`, process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000')
    )
  }

  // Redirect to Paddle hosted checkout directly
  return NextResponse.redirect(result.checkoutUrl!)
}
