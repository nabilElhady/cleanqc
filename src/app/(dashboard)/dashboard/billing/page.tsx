import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CreditCard } from 'lucide-react'
import ManageBillingButton from './ManageBillingButton'

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
      <div className="rounded-2xl border border-[#E4E4E7] p-8 bg-white max-w-2xl shadow-md">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#09090B] mb-2">Error</h2>
        <p className="text-sm text-[#71717A]">Failed to load billing information. Please verify your authentication state.</p>
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
        <h1 className="font-serif text-4xl font-bold tracking-tight text-[#09090B]">Billing Overview</h1>
        <p className="text-sm text-[#71717A] mt-1">
          Manage your organizational subscription
        </p>
      </div>

      <div className="rounded-2xl border border-[#E4E4E7] bg-white p-8 space-y-8 shadow-md">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
              Current Plan Status
            </span>
            <div>
              <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-full ${
                isSubscribed
                  ? 'border-green-600 text-green-700 bg-green-50'
                  : 'border-red-600 text-red-700 bg-red-50'
              }`}>
                {billing.status}
              </span>
            </div>
          </div>

          {isSubscribed && (
            <div className="flex flex-col space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
                Active Tier
              </span>
              <div>
                <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-full border-[#E4E4E7] text-[#09090B] bg-[#FAFAFA]">
                  {planDisplayName}
                </span>
              </div>
            </div>
          )}
        </div>

        {isSubscribed ? (
          <div className="space-y-6 pt-4 border-t border-[#E4E4E7]">
            <p className="text-sm text-[#71717A] leading-relaxed">
              Your organization is currently on an active premium plan. Manage your payments, invoices, or changes directly via our secure Customer Portal.
            </p>
            <div className="pt-2">
              <ManageBillingButton />
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-4 border-t border-[#E4E4E7]">
            <p className="text-sm text-[#71717A] leading-relaxed">
              No active subscription found. Upgrade your account to unlock all features.
            </p>
            <div className="pt-2">
              <Link
                href="/pricing"
                className="inline-block bg-[#09090B] text-white text-xs tracking-widest uppercase px-6 py-3 font-bold hover:bg-[#27272A] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-200 rounded-full text-center shadow-sm"
              >
                View Plans & Upgrade
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Billing Details & Recent Activity */}
      <div className="rounded-2xl border border-[#E4E4E7] bg-white p-8 space-y-8 shadow-md">
        <div>
          <h3 className="text-lg font-bold text-[#09090B]">
            Billing Details
          </h3>
          <p className="text-[#71717A] text-sm mt-1">
            Manage your payment methods and view billing history.
          </p>
        </div>
        
        {isSubscribed ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
                  Next Billing Date
                </span>
                <p className="text-sm font-bold text-[#09090B]">Aug 1, 2026</p>
              </div>

              <div className="flex flex-col space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
                  Payment Method
                </span>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#71717A]" />
                  <span className="text-sm font-bold text-[#09090B]">•••• 4242</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[#E4E4E7]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] block mb-2">
                Recent Invoices
              </span>

              <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#09090B]">Invoice #INV-2026-07</p>
                  <p className="text-xs text-[#71717A]">Jul 1, 2026</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-bold text-[#09090B]">$49.00</p>
                  <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-full border-green-600 text-green-600 bg-green-600/10 animate-pulse">
                    PAID
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#09090B]">Invoice #INV-2026-06</p>
                  <p className="text-xs text-[#71717A]">Jun 1, 2026</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-bold text-[#09090B]">$49.00</p>
                  <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-full border-[#E4E4E7] text-[#71717A] bg-[#FAFAFA]">
                    PAID
                  </span>
                </div>
              </div>
              
              <button className="text-[10px] font-bold text-[#09090B] uppercase tracking-widest hover:underline pt-2">
                View All Invoices &rarr;
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center border border-dashed border-[#E4E4E7] rounded-xl bg-[#FAFAFA]">
            <p className="text-sm text-[#71717A]">No billing details available yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
