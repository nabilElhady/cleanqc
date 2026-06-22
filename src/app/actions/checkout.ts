'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

export async function createCheckoutSession(planType: 'starter' | 'growth' | 'scale') {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('You must be logged in to subscribe.')
  }

  // Verify tenant ownership using Admin DB to bypass RLS blocking the org_id
  const adminDb = createAdminClient()
  const { data: profile } = await adminDb
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.org_id) {
    throw new Error('Organization context not found.')
  }

  if (profile.role !== 'owner') {
    throw new Error('Only organization owners can start a subscription.')
  }

  // Map to the exact test environment variables provided
  let creemPlanId: string | undefined
  if (planType === 'starter') creemPlanId = process.env.CREEM_PLAN_STARTER_TEST
  if (planType === 'growth') creemPlanId = process.env.CREEM_PLAN_GROWTH_TEST
  if (planType === 'scale') creemPlanId = process.env.CREEM_PLAN_SCALE_TEST

  if (!creemPlanId) {
    console.error(`Missing Environment Variable for plan: ${planType}`)
    throw new Error('Pricing configuration error. Missing Creem Plan ID.')
  }

  const creemApiKey = 'creem_test_4gaNBZdcI18mFCxZSEC8lH'
  if (!creemApiKey) {
    throw new Error('Server misconfiguration: Missing TEST_KEY for Creem API.')
  }

  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'getcrewmark.com'
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const domain = `${protocol}://${host}`

  // Determine the correct API endpoint based on the key prefix
  const safeApiKey = creemApiKey.trim()
  const isTestMode = safeApiKey.startsWith('creem_test_')
  const apiUrl = isTestMode 
    ? 'https://test-api.creem.io/v1/checkouts' 
    : 'https://api.creem.io/v1/checkouts'

  // Call Creem's API to generate a secure Checkout Session
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': safeApiKey,
    },
    body: JSON.stringify({
      product_id: creemPlanId,
      success_url: `${domain}/dashboard/billing?success=true`,
      metadata: {
        orgId: profile.org_id,
        userId: user.id
      }
    }),
    cache: 'no-store'
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('Creem API Error:', response.status, errText)
    throw new Error('Failed to securely initialize checkout session.')
  }

  const checkoutData = await response.json()
  
  if (!checkoutData?.checkout_url) {
    throw new Error('Creem API did not return a valid checkout URL.')
  }

  return { url: checkoutData.checkout_url }
}

export async function createPortalSession(): Promise<{ url: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('You must be logged in.')
  }

  const adminDb = createAdminClient()
  const { data: profile } = await adminDb
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    throw new Error('Organization context not found.')
  }

  const { data: org } = await adminDb
    .from('organizations')
    .select('creem_subscription_id')
    .eq('id', profile.org_id)
    .single()

  if (!org?.creem_subscription_id) {
    throw new Error('No active Creem subscription found for your organization.')
  }

  // Handle mock simulation for local/sandbox testing
  if (org.creem_subscription_id === 'sub_123') {
    return { url: 'https://creem.io' }
  }

  const creemApiKey = 'creem_test_4gaNBZdcI18mFCxZSEC8lH'
  const isTestMode = creemApiKey.startsWith('creem_test_')
  
  // 1. Fetch subscription details to retrieve customer_id
  const subUrl = isTestMode
    ? `https://test-api.creem.io/v1/subscriptions/${org.creem_subscription_id}`
    : `https://api.creem.io/v1/subscriptions/${org.creem_subscription_id}`

  const subResponse = await fetch(subUrl, {
    headers: { 'x-api-key': creemApiKey }
  })

  if (!subResponse.ok) {
    throw new Error('Failed to retrieve subscription from Creem.')
  }

  const subData = await subResponse.json()
  const customerId = subData.customer_id || subData.customerId || subData.customer?.id

  if (!customerId) {
    throw new Error('Could not retrieve customer details from subscription.')
  }

  // 2. Generate the customer portal link
  const portalUrl = isTestMode
    ? 'https://test-api.creem.io/v1/customer-portal'
    : 'https://api.creem.io/v1/customer-portal'

  const portalResponse = await fetch(portalUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': creemApiKey
    },
    body: JSON.stringify({ customer_id: customerId })
  })

  if (!portalResponse.ok) {
    throw new Error('Failed to generate customer portal session.')
  }

  const portalData = await portalResponse.json()
  const url = portalData.customerPortalLink || portalData.url

  if (!url) {
    throw new Error('Creem API did not return a valid customer portal URL.')
  }

  return { url }
}
