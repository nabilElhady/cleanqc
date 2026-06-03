import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Paddle, Environment } from '@paddle/paddle-node-sdk'

// Force dynamic execution
export const dynamic = 'force-dynamic'

const paddleApiKey = process.env.PADDLE_API_KEY
const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox'
const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET

// Initialize Paddle Node SDK Client
const paddle = new Paddle(paddleApiKey || '', {
  environment: paddleEnv === 'production' ? Environment.production : Environment.sandbox,
})

export async function POST(request: Request) {
  if (!paddleApiKey) {
    console.error('Paddle webhook error: PADDLE_API_KEY not configured')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  if (!webhookSecret) {
    console.error('Paddle webhook error: PADDLE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const signature = request.headers.get('paddle-signature') || ''
  if (!signature) {
    console.error('Paddle webhook error: Missing paddle-signature header')
    return NextResponse.json({ error: 'Missing signature header' }, { status: 400 })
  }

  let requestBody: string
  try {
    requestBody = await request.text()
  } catch (err: any) {
    console.error('Paddle webhook error: Failed to read request body', err)
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  let event: any
  try {
    // Verify and unmarshal the event
    event = await paddle.webhooks.unmarshal(requestBody, webhookSecret, signature)
  } catch (err: any) {
    console.error('Paddle webhook error: Signature verification failed:', err.message)
    return NextResponse.json({ error: `Signature verification failed: ${err.message}` }, { status: 400 })
  }

  const supabase = createAdminClient()
  const eventType = event.eventType
  const data = event.data

  console.log(`Paddle webhook received: ${eventType} (ID: ${event.eventId || 'unknown'})`)

  try {
    if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
      const subscription = data
      const orgId = subscription.customData?.orgId

      if (!orgId) {
        console.warn(`Paddle webhook warning: No orgId in customData for subscription ${subscription.id}`)
        return NextResponse.json({ error: 'No orgId found in customData' }, { status: 400 })
      }

      const { error: dbError } = await supabase
        .from('organizations')
        .update({
          subscription_status: subscription.status,
          paddle_subscription_id: subscription.id,
        })
        .eq('id', orgId)

      if (dbError) {
        console.error(`Paddle webhook database error updating subscription for org ${orgId}:`, dbError)
        return NextResponse.json({ error: `Database update failed: ${dbError.message}` }, { status: 500 })
      }

      console.log(`Paddle webhook success: Subscription ${subscription.id} status updated to ${subscription.status} for org ${orgId}`)
    } else if (eventType === 'subscription.canceled') {
      const subscription = data
      const orgId = subscription.customData?.orgId

      if (!orgId) {
        console.warn(`Paddle webhook warning: No orgId in customData for canceled subscription ${subscription.id}`)
        return NextResponse.json({ error: 'No orgId found in customData' }, { status: 400 })
      }

      const { error: dbError } = await supabase
        .from('organizations')
        .update({
          subscription_status: 'canceled',
          paddle_subscription_id: null,
        })
        .eq('id', orgId)

      if (dbError) {
        console.error(`Paddle webhook database error canceling subscription for org ${orgId}:`, dbError)
        return NextResponse.json({ error: `Database update failed: ${dbError.message}` }, { status: 500 })
      }

      console.log(`Paddle webhook success: Subscription ${subscription.id} canceled for org ${orgId}`)
    } else {
      console.log(`Paddle webhook info: Unhandled event type ${eventType}`)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Paddle webhook handler error:', err)
    return NextResponse.json({ error: err.message || 'Internal handler error' }, { status: 500 })
  }
}
