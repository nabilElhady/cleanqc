import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const CREEM_WEBHOOK_TEST = process.env.CREEM_WEBHOOK_TEST

export async function POST(request: NextRequest) {
  // Edge Rate Limiting
  const rateLimitResponse = await enforceRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  if (!CREEM_WEBHOOK_TEST) {
    console.error('Creem Webhook Error: CREEM_WEBHOOK_TEST is not configured.')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const signature = request.headers.get('x-creem-signature') || ''
  if (!signature) {
    console.error('Creem Webhook Error: Missing signature header.')
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  const expectedSignature = crypto
    .createHmac('sha256', CREEM_WEBHOOK_TEST)
    .update(rawBody)
    .digest('hex')

  if (signature !== expectedSignature) {
    const ip = request.headers.get('x-forwarded-for') || 'Unknown IP'
    console.error(`🚨 SECURITY ALERT: Spoofed Creem webhook request detected from IP ${ip}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const eventId = event.id || ''
  const eventType = event.type || ''
  const data = event.data || {}
  
  const orgId = data.metadata?.orgId || data.orgId

  if (!eventId) {
    return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Idempotency Check
  const { error: insertError } = await supabase
    .from('processed_webhooks')
    .insert([{ event_id: eventId }])

  if (insertError) {
    if (insertError.code === '23505') {
      console.log(`[Creem Webhook] Event ${eventId} was already processed.`)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }
    return NextResponse.json({ error: 'Database error during idempotency check' }, { status: 500 })
  }

  console.log(`[Creem Webhook] Processing Event: ${eventType} (ID: ${eventId})`)

  try {
    if (orgId && (eventType.startsWith('subscription.') || eventType.startsWith('payment.'))) {
      let statusToSet = data.status || 'active'
      let tier = 'starter'

      const planId = data.plan_id || data.product_id || ''
      if (planId === process.env.CREEM_PLAN_SCALE_TEST) tier = 'scale'
      else if (planId === process.env.CREEM_PLAN_GROWTH_TEST) tier = 'growth'

      const updatePayload = {
        subscription_status: statusToSet,
        subscription_tier: tier,
        creem_subscription_id: data.subscription_id || data.id,
        creem_last_event_time: event.created_at || new Date().toISOString()
      }

      const { error: dbError } = await supabase
        .from('organizations')
        .update(updatePayload)
        .eq('id', orgId)

      if (dbError) throw dbError
      console.log(`[Creem Webhook] Successfully updated Org ${orgId}`)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Creem Webhook] Processing Error:', err)
    return NextResponse.json({ error: err.message || 'Internal handler error' }, { status: 500 })
  }
}
