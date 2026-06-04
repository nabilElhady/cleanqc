import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Paddle, Environment } from '@paddle/paddle-node-sdk'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getBillingDetails() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Use admin client so RLS never blocks reading org_id
  const db = createAdminClient()

  const { data: profile } = await db
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return null

  const { data: org } = await db
    .from('organizations')
    .select('subscription_status, paddle_subscription_id')
    .eq('id', profile.org_id)
    .single()

  if (!org) return null

  let updateUrl = null
  let cancelUrl = null

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
    status: org.subscription_status?.toUpperCase() || 'INACTIVE',
    updateUrl,
    cancelUrl,
  }
}

export default async function BillingSettingsPage() {
  const billing = await getBillingDetails()

  if (!billing) {
    return (
      <div className="border border-[#E4E4E7] p-8 bg-white max-w-2xl">
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-[#09090B] mb-2">Error</h2>
        <p className="font-mono text-sm text-[#71717A] uppercase">Failed to load billing information. Please verify your authentication state.</p>
      </div>
    )
  }

  const isSubscribed = billing.status === 'ACTIVE' || billing.status === 'TRIALING'

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-4xl font-bold tracking-tight mb-2">Billing Settings</h2>
        <p className="font-mono text-sm text-[#71717A] uppercase tracking-wider">
          Manage your organizational subscription and invoices
        </p>
      </div>

      <div className="border border-[#E4E4E7] bg-white p-8 space-y-8">
        {/* Status Indicator */}
        <div className="flex flex-col space-y-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#71717A]">
            Current Plan Status
          </span>
          <div>
            <span className={`inline-block px-3 py-1 border font-mono text-xs tracking-wider uppercase font-bold ${
              isSubscribed
                ? 'border-green-600 text-green-600 bg-green-50/20'
                : 'border-red-600 text-red-600 bg-red-50/20'
            }`}>
              {billing.status}
            </span>
          </div>
        </div>

        {isSubscribed ? (
          <div className="space-y-6 pt-4 border-t border-[#E4E4E7]">
            <p className="font-mono text-xs text-[#71717A] uppercase leading-relaxed">
              To update your card details, view billing history, or cancel your premium plan, use Paddle's secure customer billing links below:
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              {billing.updateUrl ? (
                <a
                  href={billing.updateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#09090B] text-white font-mono text-xs tracking-widest uppercase px-6 py-3 font-bold border border-[#09090B] hover:bg-white hover:text-[#09090B] transition-colors rounded-none text-center"
                >
                  Update Payment Method
                </a>
              ) : (
                <button
                  disabled
                  className="inline-block bg-gray-200 text-gray-400 font-mono text-xs tracking-widest uppercase px-6 py-3 font-bold border border-gray-200 rounded-none text-center cursor-not-allowed"
                >
                  Update Unavailable
                </button>
              )}

              {billing.cancelUrl ? (
                <a
                  href={billing.cancelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-white text-[#71717A] border border-[#E4E4E7] font-mono text-xs tracking-widest uppercase px-6 py-3 font-bold hover:border-red-500 hover:text-red-500 transition-colors rounded-none text-center"
                >
                  Cancel Subscription
                </a>
              ) : (
                <button
                  disabled
                  className="inline-block bg-white text-gray-300 border border-gray-100 font-mono text-xs tracking-widest uppercase px-6 py-3 font-bold rounded-none text-center cursor-not-allowed"
                >
                  Cancel Unavailable
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-4 border-t border-[#E4E4E7]">
            <p className="font-mono text-xs text-[#71717A] uppercase">
              No active subscription found. Upgrade your account to unlock all features.
            </p>
            <div className="pt-2">
              <Link
                href="/pricing"
                className="inline-block bg-[#09090B] text-white font-mono text-xs tracking-widest uppercase px-6 py-3 font-bold border border-[#09090B] hover:bg-white hover:text-[#09090B] transition-colors rounded-none text-center"
              >
                View Plans & Upgrade
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
