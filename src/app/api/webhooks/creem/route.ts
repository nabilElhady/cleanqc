import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

// Force dynamic execution for serverless
export const dynamic = 'force-dynamic'

const CREEM_WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET

export async function POST(request: NextRequest | Request) {
  // 1. PHASE 3: Rate Limiting to Stop Brute-Forcers at the Edge
  const rateLimitResponse = await enforceRateLimit(request as NextRequest)
  if (rateLimitResponse) return rateLimitResponse

  if (!CREEM_WEBHOOK_SECRET) {
    console.error('Creem Webhook Error: CREEM_WEBHOOK_SECRET is not configured.')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  // Creem sends the signature in the 'x-creem-signature' header
  const signature = request.headers.get('x-creem-signature') || ''
  if (!signature) {
    console.error('Creem Webhook Error: Missing signature header.')
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  // We MUST read the raw body exactly as received for the cryptographic hash
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  // 2. PHASE 6: Cryptographic Signature Verification (Spoofing Prevention)
  const expectedSignature = crypto
    .createHmac('sha256', CREEM_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  if (signature !== expectedSignature) {
    const ip = request.headers.get('x-forwarded-for') || 'Unknown IP'
    console.error(`🚨 SECURITY ALERT: Spoofed Creem webhook request detected from IP ${ip}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Now that the signature matches, we know the payload was generated securely by Creem
  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const eventId = event.id || ''
  const eventType = event.type || ''
  const data = event.data || {}
  
  // Custom metadata mapped in Creem checkout sessions
  const orgId = data.metadata?.orgId || data.orgId

  if (!eventId) {
    return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 3. PHASE 6: Strict Idempotency Check (Retry Protection)
  // Atomic Insert. If eventId exists, Postgres throws a unique constraint error (23505)
  const { error: insertError } = await supabase
    .from('processed_webhooks')
    .insert([{ event_id: eventId }])

  if (insertError) {
    if (insertError.code === '23505') {
      console.log(`[Creem Webhook] Event ${eventId} was already processed. Acknowledging safely.`)
      // Return 200 so Creem stops retrying
      return NextResponse.json({ success: true, message: 'Already processed' })
    }
    return NextResponse.json({ error: 'Database error during idempotency check' }, { status: 500 })
  }

  console.log(`[Creem Webhook] Verified and Processing Event: ${eventType} (ID: ${eventId})`)

  try {
    // 4. Update the Tenant's billing status securely
    if (orgId && (eventType.startsWith('subscription.') || eventType.startsWith('payment.'))) {
      
      let statusToSet = data.status || 'active'
      let tier = 'starter'

      // Creem-specific logic to determine tier from their Product/Plan IDs
      const planId = data.plan_id || data.product_id || ''
      if (planId === process.env.CREEM_PLAN_SCALE) tier = 'scale'
      else if (planId === process.env.CREEM_PLAN_GROWTH) tier = 'growth'

      // Note: Make sure to update your DB columns from `paddle_` to `creem_` if you haven't already!
      const updatePayload = {
        subscription_status: statusToSet,
        subscription_tier: tier,
        creem_subscription_id: data.subscription_id || data.id,
        creem_last_event_time: event.created_at || new Date().toISOString()
      }

      // Bypass RLS using admin client to update the organization
      const { error: dbError } = await supabase
        .from('organizations')
        .update(updatePayload)
        .eq('id', orgId)

      if (dbError) throw dbError
      console.log(`[Creem Webhook] Successfully updated Org ${orgId} to status: ${statusToSet}`)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Creem Webhook] Processing Error:', err)
    return NextResponse.json({ error: err.message || 'Internal handler error' }, { status: 500 })
  }
}
