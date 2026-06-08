'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { initializePaddle, Paddle } from '@paddle/paddle-js'
import Link from 'next/link'

interface BillingClientProps {
  isAuthenticated: boolean
  userRole: string | null
  orgId: string | null
  subscriptionStatus: string | null
  subscriptionTier: string | null
  updateUrl: string | null
  cancelUrl: string | null
  paddleClientToken: string
  paddlePriceId: string
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

function BillingClientInner({
  isAuthenticated,
  userRole,
  subscriptionStatus,
  subscriptionTier,
  updateUrl,
  cancelUrl,
  paddleClientToken,
  paddlePriceId,
  paddleEnv,
}: BillingClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
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
          // Wait 3.5 seconds for the webhook to execute and propagate, then reload the page
          setTimeout(() => {
            window.location.href = '/dashboard/billing?refresh=true'
          }, 3500)
        }
      }
    })
      .then((paddleInstance) => {
        if (paddleInstance) {
          setPaddle(paddleInstance)
        }
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
      router.push(`/login?redirect=/dashboard/billing?trigger=checkout&priceId=${priceId}`)
      return
    }

    if (userRole !== 'owner') {
      setErrorMsg('Only organization owners can subscribe to billing.')
      return
    }

    if (!paddle) {
      setErrorMsg('Billing engine is still loading. Please try again in a moment.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate checkout.')
      }

      if (data.transactionId) {
        paddle.Checkout.open({
          transactionId: data.transactionId,
          settings: {
            displayMode: 'overlay',
            theme: 'light',
          }
        })
      } else {
        throw new Error('No transaction ID received from server.')
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      setErrorMsg(err.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
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
  const currentTier = TIERS.find(t => t.id === subscriptionTier) || TIERS.find(t => t.priceId === paddlePriceId) || TIERS[1]

  return (
    <div className="w-full max-w-5xl flex flex-col items-center mx-auto py-6 relative">
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

      {/* Back Link positioned cleanly */}
      <div className="self-start mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-mono font-bold uppercase tracking-wider text-[#71717A] hover:text-[#09090B] transition-colors duration-150"
        >
          ← Back to Dashboard
        </Link>
      </div>

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

      {isSubscribed ? (
        <div className="w-full max-w-md">
          <div className="bg-white border border-[#E4E4E7] p-8 rounded-none shadow-[8px_8px_0px_#09090B] flex flex-col justify-between w-full min-h-[500px]">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">
                    Monthly Plan
                  </h3>
                  <h2 className="text-3xl font-extrabold text-[#09090B]">Crewmark {currentTier.name}</h2>
                </div>
                <div className="text-right">
                  <span className="font-mono text-3xl font-extrabold">${currentTier.price}</span>
                  <span className="text-zinc-500 text-xs font-mono block">/month</span>
                </div>
              </div>

              {/* Active Subscription Notice Banner */}
              <div className="mb-6 p-3 bg-zinc-50 border border-[#E4E4E7] text-[#09090B] text-xs font-mono flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                <span className="font-bold tracking-tight uppercase">Active Subscription</span>
              </div>

              <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                {currentTier.description}
              </p>

              {/* Feature List */}
              <div className="border-t border-[#E4E4E7] pt-6 mb-8">
                <h4 className="font-mono text-xs uppercase tracking-wider text-[#09090B] font-bold mb-4">
                  What's Included:
                </h4>
                <ul className="space-y-3">
                  {currentTier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm">
                      <span className="text-emerald-600 mr-3 flex-shrink-0 font-bold">✓</span>
                      <span className="text-[#09090B]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Footer depending on subscription status */}
            <div className="mt-auto border-t border-[#E4E4E7] pt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between text-sm font-mono mb-4">
                  <span className="text-zinc-500">Subscription Status</span>
                  <span className="text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs">
                    {subscriptionStatus?.toUpperCase()}
                  </span>
                </div>
                
                <p className="font-mono text-[10px] text-[#71717A] uppercase leading-relaxed mb-4">
                  Use Paddle's secure customer billing links to manage your account details:
                </p>

                <div className="space-y-3">
                  {updateUrl ? (
                    <a
                      href={updateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#09090B] text-white hover:bg-zinc-800 py-4 px-6 font-mono text-xs tracking-wider uppercase font-bold transition-all duration-150 flex items-center justify-center border border-[#09090B] shadow-[2px_2px_0px_#FFFFFF] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-center cursor-pointer"
                    >
                      Update Payment Method
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-gray-200 text-gray-400 font-mono text-xs tracking-wider uppercase py-4 px-6 font-bold border border-gray-200 rounded-none text-center cursor-not-allowed"
                    >
                      Update Unavailable
                    </button>
                  )}

                  {cancelUrl ? (
                    <a
                      href={cancelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-white text-[#71717A] border border-[#E4E4E7] font-mono text-xs tracking-wider uppercase py-4 px-6 font-bold hover:border-red-500 hover:text-red-500 transition-colors rounded-none text-center block"
                    >
                      Cancel Subscription
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-white text-gray-300 border border-gray-100 font-mono text-xs tracking-wider uppercase py-4 px-6 font-bold rounded-none text-center cursor-not-allowed"
                    >
                      Cancel Unavailable
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl">
          {(errorMsg || errorParam) && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-mono font-medium max-w-2xl mx-auto text-center shadow-[4px_4px_0px_#FECACA]">
              {errorMsg || errorParam}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
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
                    disabled={initializing || loading}
                    className={`w-full py-4 px-6 font-mono text-sm uppercase tracking-wider font-bold transition-all flex items-center justify-center border shadow-[2px_2px_0px_#FFFFFF] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${
                      tier.highlight 
                        ? 'bg-[#09090B] text-white hover:bg-zinc-800 border-[#09090B]' 
                        : 'bg-white text-[#09090B] hover:bg-zinc-50 border-[#09090B]'
                    }`}
                  >
                    {initializing ? 'Loading...' : loading ? 'Processing...' : 'Select Plan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-zinc-500 text-xs font-mono">
        Secure billing powered by Paddle. Cancel anytime.
      </p>
    </div>
  )
}

export default function BillingClient(props: BillingClientProps) {
  return (
    <Suspense fallback={
      <div className="w-full bg-white border border-[#E4E4E7] p-8 rounded-none shadow-[8px_8px_0px_#09090B] flex items-center justify-center min-h-[500px]">
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold">
          Loading checkout system...
        </span>
      </div>
    }>
      <BillingClientInner {...props} />
    </Suspense>
  )
}
