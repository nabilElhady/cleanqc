import { createClient } from '@/lib/supabase/server'
import { PricingClient } from './PricingClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pricing | CleanQC',
  description: 'Upgrade to CleanQC Pro for premium property quality control and dispatching features.',
}

export default async function PricingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userRole: string | null = null
  let orgId: string | null = null
  let subscriptionStatus: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profile) {
      userRole = profile.role
      orgId = profile.org_id

      if (profile.org_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('subscription_status')
          .eq('id', profile.org_id)
          .single()

        if (org) {
          subscriptionStatus = org.subscription_status
        }
      }
    }
  }

  // Value list for CleanQC Pro
  const features = [
    'Unlimited quality control templates',
    'Interactive inspection reports',
    'Real-time crew dispatching',
    'Offline-ready sync',
    'Up to 10 crew members',
    'PDF export & custom branding',
  ]

  return (
    <>
      <main className="min-h-screen bg-[#FAFAFA] py-20 px-4 md:px-8 flex flex-col items-center justify-center font-sans text-[#09090B]">
        {/* Navigation / Header */}
        <div className="absolute top-8 left-8">
          <a href="/" className="font-mono text-sm tracking-wider uppercase font-bold hover:underline">
            ← CleanQC
          </a>
        </div>

        <div className="w-full max-w-5xl flex flex-col items-center">
          <div className="text-center mb-12">
            <span className="font-mono text-xs tracking-widest uppercase text-zinc-500 border border-zinc-200 px-3 py-1 rounded-full bg-white">
              Pricing Plans
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-4 text-[#09090B]">
              Simple, transparent pricing
            </h1>
            <p className="text-zinc-500 text-sm mt-3 max-w-md mx-auto">
              Everything you need to manage your cleaning team and ensure top tier property quality control.
            </p>
          </div>

          <div className="w-full max-w-md">
            <PricingClient
              isAuthenticated={!!user}
              userRole={userRole}
              orgId={orgId}
              subscriptionStatus={subscriptionStatus}
              features={features}
              paddleClientToken={process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || ''}
              paddlePriceId={process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || ''}
              paddleEnv={process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox'}
            />
          </div>

          <p className="mt-8 text-zinc-500 text-xs font-mono">
            Secure billing powered by Paddle. Cancel anytime.
          </p>
        </div>
      </main>
    </>
  )
}
