import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Paddle, Environment } from '@paddle/paddle-node-sdk'
import BillingClient from './BillingClient'

export const dynamic = 'force-dynamic'

async function getBillingData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()

  const { data: profile } = await db
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return null

  const { data: org } = await db
    .from('organizations')
    .select('subscription_status, paddle_subscription_id, subscription_tier')
    .eq('id', profile.org_id)
    .single()

  if (!org) return null

  let updateUrl: string | null = null
  let cancelUrl: string | null = null

  if (org.paddle_subscription_id && process.env.PADDLE_API_KEY) {
    try {
      const paddle = new Paddle(process.env.PADDLE_API_KEY, {
        environment: (process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox') === 'production' ? Environment.production : Environment.sandbox,
      })
      const subscription = await paddle.subscriptions.get(org.paddle_subscription_id)
      updateUrl = subscription.managementUrls?.updatePaymentMethod || null
      cancelUrl = subscription.managementUrls?.cancel || null
    } catch (err) {
      console.error('Error fetching details from Paddle:', err)
    }
  }

  return {
    isAuthenticated: true,
    userRole: profile.role,
    orgId: profile.org_id,
    subscriptionStatus: org.subscription_status,
    subscriptionTier: org.subscription_tier,
    updateUrl,
    cancelUrl,
    paddleClientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '',
    paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || '',
    paddleEnv: process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox',
  }
}

export default async function DashboardBillingPage() {
  const billingData = await getBillingData()

  if (!billingData) {
    return (
      <div className="border border-[#E4E4E7] p-8 bg-white max-w-2xl">
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-[#09090B] mb-2">Error</h2>
        <p className="font-mono text-sm text-[#71717A] uppercase">Failed to load billing information. Please verify your authentication state.</p>
      </div>
    )
  }

  return (
    <BillingClient
      isAuthenticated={billingData.isAuthenticated}
      userRole={billingData.userRole}
      orgId={billingData.orgId}
      subscriptionStatus={billingData.subscriptionStatus}
      subscriptionTier={billingData.subscriptionTier}
      updateUrl={billingData.updateUrl}
      cancelUrl={billingData.cancelUrl}
      paddleClientToken={billingData.paddleClientToken}
      paddlePriceId={billingData.paddlePriceId}
      paddleEnv={billingData.paddleEnv}
    />
  )
}
