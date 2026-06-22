import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { createPortalSession } from '@/app/actions/checkout'
import { redirect } from 'next/navigation'

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
    .select('subscription_status, subscription_tier')
    .eq('id', profile.org_id)
    .single()

  if (!org) return null

  return {
    status: org.subscription_status?.toUpperCase() || 'INACTIVE',
    tier: org.subscription_tier || 'starter',
  }
}

export default async function DashboardBillingPage() {
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

  // Format plan display name
  const planDisplayName = 
    billing.tier.charAt(0).toUpperCase() + billing.tier.slice(1) + ' Plan'

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-4xl font-bold tracking-tight mb-2">Billing Overview</h2>
        <p className="font-mono text-sm text-[#71717A] uppercase tracking-wider">
          Manage your organizational subscription
        </p>
      </div>

      <div className="border border-[#E4E4E7] bg-white p-8 space-y-8">
        <div className="grid grid-cols-2 gap-4">
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

          {isSubscribed && (
            <div className="flex flex-col space-y-2">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#71717A]">
                Active Tier
              </span>
              <div>
                <span className="inline-block px-3 py-1 border border-[#09090B] font-mono text-xs tracking-wider uppercase font-bold text-[#09090B] bg-gray-50">
                  {planDisplayName}
                </span>
              </div>
            </div>
          )}
        </div>

        {isSubscribed ? (
          <div className="space-y-6 pt-4 border-t border-[#E4E4E7]">
            <p className="font-mono text-xs text-[#71717A] uppercase leading-relaxed">
              Your organization is currently on an active premium plan. Manage your payments, invoices, or changes directly via our secure Customer Portal.
            </p>
            <div className="pt-2">
              <form action={async () => {
                'use server'
                const { url } = await createPortalSession()
                redirect(url)
              }}>
                <button
                  type="submit"
                  className="inline-block bg-[#09090B] text-white font-mono text-xs tracking-widest uppercase px-6 py-3 font-bold border border-[#09090B] hover:bg-white hover:text-[#09090B] transition-colors rounded-none cursor-pointer"
                >
                  Manage Subscription
                </button>
              </form>
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
