import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'

// Force dynamic execution
export const dynamic = 'force-dynamic'

const paddleApiKey = process.env.PADDLE_API_KEY
const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox'
const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET

// Initialize Paddle Node SDK Client


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
  } catch (err: any) {
    console.error('Paddle webhook error: Signature verification failed:', err.message)
    return NextResponse.json({ error: `Signature verification failed: ${err.message}` }, { status: 400 })
  }

  const supabase = createAdminClient()
  const eventType = event.eventType
  const data = event.data
  const eventId = event.eventId || ''
  const occurredAt = event.occurredAt || new Date().toISOString()

  console.log(`Paddle webhook received: ${eventType} (ID: ${eventId})`)

  if (!eventId) {
    console.error('Paddle webhook error: Missing eventId')
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
  }

  // 1. IDEMPOTENCY CHECK
  const { error: insertError } = await supabase
    .from('processed_webhooks')
    .insert([{ event_id: eventId }])
    
  if (insertError) {
    if (insertError.code === '23505') {
      console.log(`Paddle webhook info: Event ${eventId} already processed. Skipping.`)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }
    console.error(`Paddle webhook error checking idempotency for ${eventId}:`, insertError)
    return NextResponse.json({ error: 'Database error during idempotency check' }, { status: 500 })
  }

  try {
    if (
      eventType === 'subscription.created' || 
      eventType === 'subscription.updated' ||
      eventType === 'subscription.canceled' ||
      eventType === 'subscription.past_due' ||
      eventType === 'subscription.paused'
    ) {
      const subscription = data
      const orgId = subscription.customData?.orgId

      if (!orgId) {
        console.warn(`Paddle webhook warning: No orgId in customData for subscription ${subscription.id}`)
        return NextResponse.json({ error: 'No orgId found in customData' }, { status: 400 })
      }

      // 2. OCCURRED_AT ORDERING CHECK
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('paddle_last_event_time')
        .eq('id', orgId)
        .single()

      if (orgError) {
        console.error(`Paddle webhook error fetching org ${orgId}:`, orgError)
        return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
      }

      const lastEventTime = orgData?.paddle_last_event_time
      if (lastEventTime && new Date(occurredAt) <= new Date(lastEventTime)) {
        console.log(`Paddle webhook info: Event ${eventId} occurred at ${occurredAt} is older than or equal to last processed event time ${lastEventTime}. Skipping state update.`)
        // We already marked it processed, so just return 200
        return NextResponse.json({ success: true, message: 'Event is older than current state' })
      }

      // 3 & 4. NEW EVENT HANDLERS AND CANCELLATION FIX
      let statusToSet = subscription.status
      let paddleSubscriptionId = subscription.id
      let tier = 'starter'

      if (eventType === 'subscription.canceled') {
        statusToSet = 'canceled'
      } else if (eventType === 'subscription.past_due') {
        statusToSet = 'past_due'
      } else if (eventType === 'subscription.paused') {
        statusToSet = 'paused'
      } else if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
        // Determine subscription tier based on Price ID
        const priceId = subscription.items?.[0]?.price?.id || subscription.items?.[0]?.price_id || ''
        if (priceId === (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_SCALE || 'pri_scale_123')) tier = 'scale'
        else if (priceId === (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_GROWTH || 'pri_growth_456')) tier = 'growth'
        else if (priceId === (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER || 'pri_starter_789')) tier = 'starter'
      }

      const updatePayload: any = {
        subscription_status: statusToSet,
        paddle_last_event_time: occurredAt
      }

      // Only update tier and paddle_subscription_id if we have them active
      if (eventType !== 'subscription.canceled' && eventType !== 'subscription.past_due' && eventType !== 'subscription.paused') {
        updatePayload.paddle_subscription_id = paddleSubscriptionId
        updatePayload.subscription_tier = tier
      }

      const { error: dbError } = await supabase
        .from('organizations')
        .update(updatePayload)
        .eq('id', orgId)

      if (dbError) {
        console.error(`Paddle webhook database error updating subscription for org ${orgId}:`, dbError)
        return NextResponse.json({ error: `Database update failed: ${dbError.message}` }, { status: 500 })
      }

      console.log(`Paddle webhook success: Subscription ${subscription.id} status updated to ${statusToSet} for org ${orgId}`)

      // Trial abuse check for created/updated
      if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
        try {
          const payments = (subscription as any).transaction?.payments || (subscription as any).payments
          const cardDetails = payments?.[0]?.method_details?.card
          
          // Extract ownerId directly from webhook customData (metadata)
          const ownerId = subscription.customData?.userId || subscription.customData?.ownerId
          
          if (cardDetails && ownerId) {
            const last4 = cardDetails.last4
            const expiry = `${cardDetails.expiry_month}/${cardDetails.expiry_year}`

            // Execute the update and fetch the IP address in a single DB round-trip
            const { data: currentUserTracker } = await supabase
              .from('trial_tracking')
              .update({ card_last_4: last4, card_expiry: expiry })
              .eq('user_id', ownerId)
              .select('ip_address')
              .single()

            if (currentUserTracker?.ip_address && currentUserTracker.ip_address !== 'unknown') {
              const { data: abusers } = await supabase
                .from('trial_tracking')
                .select('user_id')
                .eq('card_last_4', last4)
                .eq('card_expiry', expiry)
                .eq('ip_address', currentUserTracker.ip_address)
                .neq('user_id', ownerId)

              if (abusers && abusers.length > 0) {
                console.warn(`🚨 TRIAL ABUSE DETECTED: IP ${currentUserTracker.ip_address} and card last4 ${last4} matches multiple accounts! Owner ID: ${ownerId}`)
                await supabase
                  .from('organizations')
                  .update({ subscription_status: 'trial_abuse_suspended' })
                  .eq('id', orgId)
              }
            }
          }
        } catch (err) {
          console.error('Error processing trial abuse checks in Paddle webhook:', err)
        }
      }
    } else {
      console.log(`Paddle webhook info: Unhandled event type ${eventType}`)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Paddle webhook handler error:', err)
    return NextResponse.json({ error: err.message || 'Internal handler error' }, { status: 500 })
  }
}
