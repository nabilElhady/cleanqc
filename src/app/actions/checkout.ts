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

/**
 * @deprecated Use getCustomerPortalUrl() from @/app/actions/billing instead.
 * Kept for backwards compatibility — delegates to the canonical implementation.
 */
export async function createPortalSession(): Promise<{ url: string }> {
  const { getCustomerPortalUrl } = await import('@/app/actions/billing')
  const result = await getCustomerPortalUrl()
  if (result.error) throw new Error(result.error)
  return { url: result.url! }
}

