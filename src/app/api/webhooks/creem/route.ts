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
    console.error('[Creem Webhook] CREEM_WEBHOOK_TEST is not configured.')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const signature = request.headers.get('creem-signature') || request.headers.get('x-creem-signature') || ''
  if (!signature) {
    console.error('[Creem Webhook] Missing signature header.')
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
    console.error(`🚨 [Creem Webhook] SECURITY ALERT: Spoofed signature detected from IP ${ip}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const eventId = event.id || event.eventId || ''
  const eventType = event.eventType || event.type || ''
  const data = event.object || event.data || {}

  if (!eventId) {
    return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
  }

  // We only process billing/subscription events
  const isBillingEvent = eventType.startsWith('subscription.') || eventType.startsWith('payment.') || eventType.startsWith('checkout.')
  if (!isBillingEvent) {
    return NextResponse.json({ success: true, message: 'Ignored non-billing event' })
  }

  const supabase = createAdminClient()

  try {
    // 1. Resolve Org ID (checking metadata first, then falling back to customer email search)
    let resolvedOrgId = data.metadata?.orgId || data.metadata?.org_id || data.orgId || data.org_id

    if (!resolvedOrgId) {
      const email = data.customer?.email || data.email || data.customer_email || data.customer?.customer_email
      if (email) {
        console.log(`[Creem Webhook] Attempting fallback resolution for email: ${email}`)
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers()
        if (!listErr && listData?.users) {
          const matchedUser = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
          if (matchedUser) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('org_id')
              .eq('id', matchedUser.id)
              .single()
            resolvedOrgId = profile?.org_id
          }
        }
      }
    }

    if (!resolvedOrgId) {
      console.error(`[Creem Webhook] Failed to resolve orgId for event ${eventId}. Returning 422 to trigger retry.`)
      // Returning 422 Unprocessable Entity tells Creem to retry later (e.g. if profile creation is racing)
      return NextResponse.json({ error: 'Org ID context could not be resolved' }, { status: 422 })
    }

    // 2. Parse status, tier and subscription ID
    let statusToSet = data.status || 'active'
    let tier = 'starter'

    const planId = data.plan_id || data.product_id || data.product?.id || ''
    if (planId === process.env.CREEM_PLAN_SCALE_TEST || planId === process.env.CREEM_PLAN_SCALE) {
      tier = 'scale'
    } else if (planId === process.env.CREEM_PLAN_GROWTH_TEST || planId === process.env.CREEM_PLAN_GROWTH) {
      tier = 'growth'
    }

    const creemSubscriptionId = data.subscription_id || data.subscriptionId || data.id || ''
    
    // Convert Unix millisecond timestamp or string date to ISO string safely for Postgres
    const rawCreatedAt = event.created_at || event.createdAt
    let eventCreatedAt: string
    if (rawCreatedAt) {
      const parsedDate = new Date(typeof rawCreatedAt === 'number' ? rawCreatedAt : rawCreatedAt)
      eventCreatedAt = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString()
    } else {
      eventCreatedAt = new Date().toISOString()
    }

    console.log(`[Creem Webhook] Processing event ${eventType} for Org ${resolvedOrgId}. Subscription: ${creemSubscriptionId}`)

    // 3. Execute atomic transaction via Database RPC function
    const { data: rpcResult, error: rpcError } = await supabase.rpc('process_creem_webhook_event', {
      p_event_id: eventId,
      p_org_id: resolvedOrgId,
      p_subscription_status: statusToSet,
      p_subscription_tier: tier,
      p_creem_subscription_id: creemSubscriptionId,
      p_event_created_at: eventCreatedAt
    })

    if (rpcError) {
      console.error('[Creem Webhook] RPC Execution Error:', rpcError)
      throw new Error(`RPC failed: ${rpcError.message}`)
    }

    console.log(`[Creem Webhook] Atomic transaction completed successfully for event ${eventId}`)
    return NextResponse.json({ success: true, result: rpcResult })
  } catch (err: any) {
    console.error('[Creem Webhook] Failed to process webhook:', err)
    return NextResponse.json({ error: err.message || 'Internal handler error' }, { status: 500 })
  }
}
