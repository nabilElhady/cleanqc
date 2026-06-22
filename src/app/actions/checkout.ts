'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function createCheckoutSession(planType: 'starter' | 'growth' | 'scale') {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('You must be logged in to subscribe.')
  }

  // Verify tenant ownership to prevent unauthorized upgrades
  const { data: profile } = await supabase
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

  // Securely map the requested plan to the Creem Plan ID stored strictly on the server
  let creemPlanId: string | undefined
  if (planType === 'starter') creemPlanId = process.env.CREEM_PLAN_STARTER
  if (planType === 'growth') creemPlanId = process.env.CREEM_PLAN_GROWTH
  if (planType === 'scale') creemPlanId = process.env.CREEM_PLAN_SCALE

  if (!creemPlanId) {
    console.error(`Missing Environment Variable for plan: ${planType}`)
    throw new Error('Pricing configuration error. Missing Creem Plan ID.')
  }

  const creemApiKey = process.env.CREEM_API_KEY
  if (!creemApiKey) {
    throw new Error('Server misconfiguration: Missing Creem API Key.')
  }

  // Construct the redirect URLs dynamically based on the current origin
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'getcrewmark.com'
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const domain = `${protocol}://${host}`

  // Call Creem's API to generate a secure Checkout Session
  const response = await fetch('https://api.creem.io/v1/checkouts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': creemApiKey,
    },
    body: JSON.stringify({
      plan_id: creemPlanId,
      success_url: `${domain}/dashboard/billing?success=true`,
      cancel_url: `${domain}/pricing?canceled=true`,
      // CRITICAL: We pass the org_id to Creem so the Webhook (Phase 6) knows who to upgrade!
      metadata: {
        orgId: profile.org_id,
        userId: user.id
      }
    }),
    cache: 'no-store' // Never cache payment generation
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('Creem API Error:', response.status, errText)
    throw new Error('Failed to securely initialize checkout session.')
  }

  const { data } = await response.json()
  
  if (!data?.url) {
    throw new Error('Creem API did not return a valid checkout URL.')
  }

  // We return the URL so the client component can smoothly redirect using window.location
  return { url: data.url }
}
