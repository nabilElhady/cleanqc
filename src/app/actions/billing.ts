'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Creem API helpers
 * Correct endpoint per docs: POST /v1/customers/billing
 * Response field:            customer_portal_link
 * Test base URL:             https://test-api.creem.io
 * Live base URL:             https://api.creem.io
 */

// All subscriptions were created using the test key (hardcoded in checkout.ts)
const TEST_KEY = process.env.TEST_KEY || 'creem_test_4gaNBZdcI18mFCxZSEC8lH'
const LIVE_KEY = process.env.CREEM_API || ''

function getCreemBase(isTest: boolean) {
  return isTest ? 'https://test-api.creem.io' : 'https://api.creem.io'
}

/** Call the correct Creem portal endpoint and return the redirect URL */
async function requestPortalLink(customerId: string, apiKey: string, isTest: boolean): Promise<string | null> {
  const base = getCreemBase(isTest)
  const url = `${base}/v1/customers/billing`  // ← correct endpoint

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ customer_id: customerId }),
    cache: 'no-store',
  })

  const raw = await res.text()
  console.log(`[Creem] customers/billing (${isTest ? 'test' : 'live'}) → ${res.status}: ${raw}`)

  if (!res.ok) return null

  let data: any = {}
  try { data = JSON.parse(raw) } catch { return null }

  // The Creem API returns { customer_portal_link: "https://..." }
  return data.customer_portal_link || null
}

/** Fetch a subscription from Creem to extract the customer_id */
async function getCustomerIdFromSubscription(subscriptionId: string, apiKey: string, isTest: boolean): Promise<string | null> {
  const base = getCreemBase(isTest)
  const res = await fetch(`${base}/v1/subscriptions/${subscriptionId}`, {
    headers: { 'x-api-key': apiKey },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    console.warn(`[Creem] subscription lookup (${isTest ? 'test' : 'live'}) ${subscriptionId} → ${res.status}: ${body}`)
    return null
  }

  const data = await res.json()
  return data.customer_id || data.customerId || data.customer?.id || null
}

export async function getCustomerPortalUrl(): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Session expired. Please sign in again.' }

  // 2. Get profile and org via admin client (bypasses RLS)
  const adminDb = createAdminClient()
  const { data: profile } = await adminDb
    .from('profiles')
    .select('org_id, organizations!inner(creem_customer_id, creem_subscription_id)')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return { error: 'Organization not found.' }

  const org = Array.isArray(profile.organizations) ? profile.organizations[0] : profile.organizations;
  if (!org) return { error: 'Billing record not found.' }

  try {
    // ── Path A: customer_id is already stored → call portal directly ──────────
    if (org.creem_customer_id) {
      // Always try test first (that's where all subscriptions were created)
      let portalUrl = await requestPortalLink(org.creem_customer_id, TEST_KEY, true)

      // If test mode fails and we have a live key, try live
      if (!portalUrl && LIVE_KEY) {
        portalUrl = await requestPortalLink(org.creem_customer_id, LIVE_KEY, false)
      }

      if (portalUrl) return { url: portalUrl }

      return {
        error: 'Creem returned an empty portal response. Your plan may be inactive. Please contact support.',
      }
    }

    // ── Path B: no customer_id stored yet → look up via subscription ID ───────
    if (!org.creem_subscription_id) {
      return { error: 'No active subscription found. Please subscribe first.' }
    }

    // Try test API first, then live
    let customerId = await getCustomerIdFromSubscription(org.creem_subscription_id, TEST_KEY, true)
    if (!customerId && LIVE_KEY) {
      customerId = await getCustomerIdFromSubscription(org.creem_subscription_id, LIVE_KEY, false)
    }

    if (!customerId) {
      return {
        error: `Subscription ${org.creem_subscription_id} was not found on the Creem API. It may have expired. Please contact support.`,
      }
    }

    // Persist the customer_id so Path A works next time
    await adminDb
      .from('organizations')
      .update({ creem_customer_id: customerId })
      .eq('id', profile.org_id)

    // Now generate the portal URL with the freshly resolved customer_id
    let portalUrl = await requestPortalLink(customerId, TEST_KEY, true)
    if (!portalUrl && LIVE_KEY) {
      portalUrl = await requestPortalLink(customerId, LIVE_KEY, false)
    }

    if (portalUrl) return { url: portalUrl }

    return { error: 'Creem did not return a portal link. Please try again.' }

  } catch (err: any) {
    console.error('[Creem Portal] Unexpected error:', err)
    return { error: `Server error: ${err.message}` }
  }
}
