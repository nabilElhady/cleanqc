import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Paddle, Environment } from '@paddle/paddle-node-sdk'

export const dynamic = 'force-dynamic'

const paddleApiKey = process.env.PADDLE_API_KEY
const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox'

// Initialize Paddle client helper
function getPaddleClient() {
  if (!paddleApiKey) {
    throw new Error('PADDLE_API_KEY is not configured')
  }
  return new Paddle(paddleApiKey, {
    environment: paddleEnv === 'production' ? Environment.production : Environment.sandbox,
  })
}

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch organization profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    // 3. Fetch paddle subscription ID from organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('paddle_subscription_id')
      .eq('id', profile.org_id)
      .single()

    if (orgError || !org?.paddle_subscription_id) {
      return NextResponse.json({
        update_payment_method: null,
        cancel_subscription: null,
        message: 'No active Paddle subscription found.'
      })
    }

    // 4. Query Paddle SDK
    const paddle = getPaddleClient()
    const subscription = await paddle.subscriptions.get(org.paddle_subscription_id)

    return NextResponse.json({
      update_payment_method: subscription.managementUrls?.updatePaymentMethod || null,
      cancel_subscription: subscription.managementUrls?.cancel || null,
    })

  } catch (err: any) {
    console.error('Error fetching billing portal details:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
