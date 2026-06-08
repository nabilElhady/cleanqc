'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { initializePaddle, Paddle } from '@paddle/paddle-js'

interface PricingClientProps {
  isAuthenticated: boolean
  userRole: string | null
  orgId: string | null
  subscriptionStatus: string | null
  features: string[]
  paddleClientToken: string
  paddlePriceId: string // Fallback, we'll use environment variables for tiers
  paddleEnv: string
}

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    description: 'Perfect for small teams getting started with organized dispatching.',
    features: ['1 Manager', 'Up to 5 Crew Members', 'Basic templates', 'Job dispatch'],
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER || 'pri_starter_789',
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 49,
    description: 'Our most popular plan. Crush legacy enterprise tools with lightning speed.',
    features: ['3 Managers', 'Up to 20 Crew Members', 'Custom templates', 'Advanced QC reports', 'Zero-Latency Mobile QC Experience'],
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_GROWTH || 'pri_growth_456',
    highlight: true,
    badge: 'Competitor Equivalent: $225/mo',
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 99,
    description: 'For large operations requiring limitless expansion and VIP support.',
    features: ['Unlimited Managers', 'Unlimited Crew Members', 'Multi-location support', 'Priority 24/7 support'],
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_SCALE || 'pri_scale_123',
    highlight: false,
  },
]

function PricingClientInner({
  isAuthenticated,
  userRole,
  subscriptionStatus,
  paddleClientToken,
  paddleEnv,
}: PricingClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [paddle, setPaddle] = useState<Paddle | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const errorParam = searchParams.get('error')

  // Initialize Paddle.js using official loader
  useEffect(() => {
    setInitializing(true)
    initializePaddle({
      environment: paddleEnv === 'sandbox' ? 'sandbox' : 'production',
      token: paddleClientToken,
      eventCallback: function(data: any) {
        console.log('Paddle Event:', data)
        if (data.name === 'checkout.completed') {
          setProvisioning(true)
          // Wait 3.5 seconds for the webhook to execute and propagate, then redirect
          setTimeout(() => {
            window.location.href = '/dashboard/billing?refresh=true'
          }, 3500)
        }
      }
    })
      .then((paddleInstance) => {
        if (paddleInstance) setPaddle(paddleInstance)
        setInitializing(false)
      })
      .catch((err) => {
        console.error('Error initializing Paddle:', err)
        setErrorMsg('Failed to load the billing module. Please refresh the page.')
        setInitializing(false)
      })
  }, [paddleClientToken, paddleEnv])

  const handleSubscribe = async (priceId: string) => {
    setErrorMsg(null)

    if (!isAuthenticated) {
      router.push(`/login?redirect=/pricing?trigger=checkout&priceId=${priceId}`)
      return
    }

    if (userRole !== 'owner') {
      setErrorMsg('Only organization owners can manage subscriptions.')
      return
    }

    if (!paddle) {
      setErrorMsg('Billing engine is still loading. Please try again in a moment.')
      return
    }

    try {
      setLoadingPriceId(priceId)

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate checkout.')
      }

      if (data.transactionId) {
        paddle.Checkout.open({
          transactionId: data.transactionId,
          settings: { displayMode: 'overlay', theme: 'light' }
        })
      } else {
        throw new Error('No transaction ID received from server.')
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      setErrorMsg(err.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoadingPriceId(null)
    }
  }

  // Automatically trigger subscribe if trigger query param is set
  useEffect(() => {
    const trigger = searchParams.get('trigger')
    const triggerPriceId = searchParams.get('priceId')
    
    if (trigger === 'checkout' && triggerPriceId && isAuthenticated && userRole === 'owner' && paddle && !initializing) {
      const newParams = new URLSearchParams(window.location.search)
      newParams.delete('trigger')
      newParams.delete('priceId')
      const searchString = newParams.toString()
      const cleanPath = window.location.pathname + (searchString ? `?${searchString}` : '')
      router.replace(cleanPath)

      handleSubscribe(triggerPriceId)
    }
  }, [searchParams, isAuthenticated, userRole, paddle, initializing])

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
      {/* Full-screen Provisioning Overlay */}
      {provisioning && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <span className="h-8 w-8 rounded-full border-4 border-zinc-300 border-t-zinc-900 animate-spin" />
          <h3 className="font-mono text-xs uppercase tracking-widest text-[#09090B] font-extrabold mt-4 animate-pulse">
            Provisioning your subscription...
          </h3>
          <p className="text-zinc-500 text-[10px] font-mono mt-1 uppercase">
            Please wait a moment while we configure your account
          </p>
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
                onClick={() => handleSubscribe(tier.priceId)}
                disabled={initializing || loadingPriceId !== null}
                className={`w-full py-4 px-6 font-mono text-sm uppercase tracking-wider font-bold transition-all flex items-center justify-center border shadow-[2px_2px_0px_#FFFFFF] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  tier.highlight 
                    ? 'bg-[#09090B] text-white hover:bg-zinc-800 border-[#09090B]' 
                    : 'bg-white text-[#09090B] hover:bg-zinc-50 border-[#09090B]'
                }`}
              >
                {loadingPriceId === tier.priceId ? 'Processing...' : initializing ? 'Loading...' : 'Select Plan'}
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
