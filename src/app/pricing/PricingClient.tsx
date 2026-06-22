'use client'

import { useState, useEffect, Suspense, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createCheckoutSession } from '@/app/actions/checkout'

interface PricingClientProps {
  isAuthenticated: boolean
  userRole: string | null
  orgId: string | null
  subscriptionStatus: string | null
  features: string[]
}

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    description: 'Perfect for small teams getting started with organized dispatching.',
    features: ['1 Manager', 'Up to 5 Crew Members', 'Basic templates', 'Job dispatch'],
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 49,
    description: 'Our most popular plan. Crush legacy enterprise tools with lightning speed.',
    features: ['3 Managers', 'Up to 20 Crew Members', 'Custom templates', 'Advanced QC reports', 'Zero-Latency Mobile QC Experience'],
    highlight: true,
    badge: 'Competitor Equivalent: $225/mo',
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 99,
    description: 'For large operations requiring limitless expansion.',
    features: ['Unlimited Managers', 'Unlimited Crew Members'],
    highlight: false,
  },
]

function PricingClientInner({
  isAuthenticated,
  userRole,
  subscriptionStatus,
}: PricingClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  
  const errorParam = searchParams.get('error')
  const canceledParam = searchParams.get('canceled')

  const handleSubscribe = async (tierId: 'starter' | 'growth' | 'scale') => {
    setErrorMsg(null)

    if (!isAuthenticated) {
      router.push(`/login?redirect=/pricing?trigger=checkout&tier=${tierId}`)
      return
    }

    if (userRole !== 'owner') {
      setErrorMsg('Only organization owners can manage subscriptions.')
      return
    }

    setLoadingPriceId(tierId)

    startTransition(async () => {
      try {
        const { url } = await createCheckoutSession(tierId)
        
        if (url) {
          // Hard redirect to the Creem hosted checkout overlay/page
          window.location.href = url
        }
      } catch (err: any) {
        console.error('Checkout error:', err)
        setErrorMsg(err.message || 'An unexpected error occurred. Please try again.')
        setLoadingPriceId(null)
      }
    })
  }

  // Automatically trigger subscribe if trigger query param is set after login
  useEffect(() => {
    const trigger = searchParams.get('trigger')
    const triggerTier = searchParams.get('tier') as 'starter' | 'growth' | 'scale'
    
    if (trigger === 'checkout' && triggerTier && isAuthenticated && userRole === 'owner') {
      const newParams = new URLSearchParams(window.location.search)
      newParams.delete('trigger')
      newParams.delete('tier')
      const searchString = newParams.toString()
      const cleanPath = window.location.pathname + (searchString ? `?${searchString}` : '')
      router.replace(cleanPath)

      handleSubscribe(triggerTier)
    }
  }, [searchParams, isAuthenticated, userRole, router])

  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

  // Upsell Prevention Layout State
  if (isSubscribed) {
    return (
      <div className="bg-white border border-[#E4E4E7] p-8 shadow-[8px_8px_0px_#09090B] flex flex-col justify-between w-full max-w-2xl mx-auto">
        <div className="mb-6">
          <span className="font-mono text-xs uppercase tracking-widest text-emerald-600 font-bold mb-1 block">
            Active Subscription
          </span>
          <h2 className="text-3xl font-extrabold text-[#09090B]">Crewmark Pro</h2>
          <p className="text-zinc-700 text-sm mt-4 leading-relaxed font-medium">
            Your organization is actively subscribed. You can manage your billing directly from your dashboard settings.
          </p>
        </div>
        <a
          href="/dashboard"
          className="w-full bg-[#09090B] text-white hover:bg-zinc-800 py-4 px-6 font-mono text-sm uppercase tracking-wider font-bold transition-all flex items-center justify-center border border-[#09090B] shadow-[2px_2px_0px_#FFFFFF] text-center"
        >
          Go to Dashboard
        </a>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center relative">
      {canceledParam && (
         <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm font-mono font-medium max-w-2xl w-full text-center shadow-[4px_4px_0px_#FEF08A]">
           Checkout canceled. You have not been charged.
         </div>
      )}

      {(errorMsg || errorParam) && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-mono font-medium max-w-2xl w-full text-center shadow-[4px_4px_0px_#FECACA]">
          {errorMsg || errorParam}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`bg-white border p-8 flex flex-col justify-between w-full min-h-[500px] transition-transform duration-200 ${
              tier.highlight 
                ? 'border-[#09090B] shadow-[8px_8px_0px_#09090B] md:-translate-y-4' 
                : 'border-[#E4E4E7] shadow-[4px_4px_0px_#E4E4E7] hover:shadow-[8px_8px_0px_#09090B]'
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`font-mono text-xs uppercase tracking-widest font-bold mb-1 ${tier.highlight ? 'text-emerald-600' : 'text-zinc-500'}`}>
                    {tier.name}
                  </h3>
                  <h2 className="text-3xl font-extrabold text-[#09090B]">${tier.price}</h2>
                  <span className="text-zinc-500 text-xs font-mono block">/month</span>
                </div>
              </div>

              {tier.badge && (
                <div className="mb-4 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                  {tier.badge}
                </div>
              )}

              <p className="text-zinc-600 text-sm mb-6 leading-relaxed font-medium">
                {tier.description}
              </p>

              <div className="border-t border-[#E4E4E7] pt-6 mb-8">
                <ul className="space-y-3">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm">
                      <span className="text-emerald-600 mr-3 flex-shrink-0 font-bold">✓</span>
                      <span className={`${feature.includes('Zero-Latency') ? 'font-bold text-[#09090B]' : 'text-zinc-700'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={() => handleSubscribe(tier.id as 'starter' | 'growth' | 'scale')}
                disabled={isPending || loadingPriceId !== null}
                className={`w-full py-4 px-6 font-mono text-sm uppercase tracking-wider font-bold transition-all flex items-center justify-center border shadow-[2px_2px_0px_#FFFFFF] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  tier.highlight 
                    ? 'bg-[#09090B] text-white hover:bg-zinc-800 border-[#09090B]' 
                    : 'bg-white text-[#09090B] hover:bg-zinc-50 border-[#09090B]'
                }`}
              >
                {loadingPriceId === tier.id ? 'Loading Checkout...' : 'Select Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PricingClient(props: PricingClientProps) {
  return (
    <Suspense fallback={
      <div className="w-full bg-white border border-[#E4E4E7] p-8 shadow-[8px_8px_0px_#09090B] flex items-center justify-center min-h-[500px]">
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold">
          Loading pricing system...
        </span>
      </div>
    }>
      <PricingClientInner {...props} />
    </Suspense>
  )
}
