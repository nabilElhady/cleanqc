import { createClient, createAdminClient } from '@/lib/supabase/server'
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
    .select('subscription_status')
    .eq('id', profile.org_id)
    .single()

  if (!org) return null

  return {
    status: org.subscription_status?.toUpperCase() || 'INACTIVE',
  }
}

export default async function BillingSettingsPage() {
  const billing = await getBillingDetails()

  if (!billing) {
    return (
      <div className="rounded-2xl border-2 border-zinc-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 max-w-2xl relative z-10" style={{ backgroundColor: '#f4f4f5' }}>
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

      <div className="rounded-2xl border-2 border-zinc-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-8 relative z-10" style={{ backgroundColor: '#f4f4f5' }}>
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
              Your organization is currently on an active premium plan. Full billing management portal coming soon.
            </p>
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
