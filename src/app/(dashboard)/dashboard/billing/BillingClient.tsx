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
  updateUrl: string | null
  cancelUrl: string | null
  paddleClientToken: string
  paddlePriceId: string
  paddleEnv: string
}

function BillingClientInner({
  isAuthenticated,
  userRole,
  subscriptionStatus,
  updateUrl,
  cancelUrl,
  paddleClientToken,
  paddleEnv,
}: BillingClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
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

  const handleSubscribe = async () => {
    setErrorMsg(null)

    if (!isAuthenticated) {
      router.push('/login?redirect=/dashboard/billing?trigger=checkout')
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
    if (trigger === 'checkout' && isAuthenticated && userRole === 'owner' && paddle && !initializing) {
      const newParams = new URLSearchParams(window.location.search)
      newParams.delete('trigger')
      const searchString = newParams.toString()
      const cleanPath = window.location.pathname + (searchString ? `?${searchString}` : '')
      router.replace(cleanPath)
      handleSubscribe()
    }
  }, [searchParams, isAuthenticated, userRole, paddle, initializing])

  const getButtonText = () => {
    if (initializing) return 'Initializing Billing Engine...'
    if (loading) return 'Processing...'
    return 'Subscribe Now'
  }

  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

  const features = [
    'Unlimited quality control templates',
    'Interactive inspection reports',
    'Real-time crew dispatching',
    'Offline-ready sync',
    'Up to 10 crew members',
    'PDF export & custom branding',
  ]

  return (
    <div className="w-full max-w-5xl flex flex-col items-center mx-auto py-6 relative">
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

      <div className="w-full max-w-md">
        <div className="bg-white border border-[#E4E4E7] p-8 rounded-none shadow-[8px_8px_0px_#09090B] flex flex-col justify-between w-full min-h-[500px]">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">
                  Monthly Plan
                </h3>
                <h2 className="text-3xl font-extrabold text-[#09090B]">Crewmark Pro</h2>
              </div>
              <div className="text-right">
                <span className="font-mono text-3xl font-extrabold">$49</span>
                <span className="text-zinc-500 text-xs font-mono block">/month</span>
              </div>
            </div>

            {/* 7-Day Free Trial Notice Banner */}
            <div className="mb-6 p-3 bg-zinc-50 border border-[#E4E4E7] text-[#09090B] text-xs font-mono flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
              <span className="font-bold tracking-tight uppercase">Includes 7-Day Free Trial</span>
            </div>

            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
              Unlock full team access, custom branding, and advanced template builders to supercharge your property management.
            </p>

            {/* Feature List */}
            <div className="border-t border-[#E4E4E7] pt-6 mb-8">
              <h4 className="font-mono text-xs uppercase tracking-wider text-[#09090B] font-bold mb-4">
                What's Included:
              </h4>
              <ul className="space-y-3">
                {features.map((feature, idx) => (
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
            {isSubscribed ? (
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
            ) : (
              <div>
                {(errorMsg || errorParam) && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono font-medium">
                    {errorMsg || errorParam}
                  </div>
                )}

                <button
                  onClick={handleSubscribe}
                  disabled={initializing || loading}
                  className="w-full bg-[#09090B] text-white hover:bg-zinc-800 disabled:bg-zinc-400 py-4 px-6 font-mono text-sm uppercase tracking-wider font-bold transition-all duration-150 flex items-center justify-center border border-[#09090B] shadow-[2px_2px_0px_#FFFFFF] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:cursor-not-allowed"
                >
                  {getButtonText()}
                </button>


              </div>
            )}
          </div>
        </div>
      </div>

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
