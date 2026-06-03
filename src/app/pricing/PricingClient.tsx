'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { initializePaddle, Paddle } from '@paddle/paddle-js'

interface PricingClientProps {
  isAuthenticated: boolean
  userRole: string | null
  orgId: string | null
  features: string[]
  paddleClientToken: string
  paddlePriceId: string
  paddleEnv: string
}

function PricingClientInner({
  isAuthenticated,
  userRole,
  features,
  paddleClientToken,
  paddleEnv,
}: PricingClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [paddle, setPaddle] = useState<Paddle | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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
      // Redirect to login page and pass pricing page with auto-trigger parameter as target
      router.push('/login?redirect=/pricing?trigger=checkout')
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
        // Open the Paddle checkout as overlay
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

  // Automatically trigger subscribe if trigger query param is set (coming back after login redirection)
  useEffect(() => {
    const trigger = searchParams.get('trigger')
    if (trigger === 'checkout' && isAuthenticated && userRole === 'owner' && paddle && !initializing) {
      // Remove trigger param from the URL right away to avoid duplicate trigger on reload
      const newParams = new URLSearchParams(window.location.search)
      newParams.delete('trigger')
      const searchString = newParams.toString()
      const cleanPath = window.location.pathname + (searchString ? `?${searchString}` : '')
      router.replace(cleanPath)

      // Execute payment creation
      handleSubscribe()
    }
  }, [searchParams, isAuthenticated, userRole, paddle, initializing])

  const getButtonText = () => {
    if (initializing) return 'Initializing Billing Engine...'
    if (loading) return 'Processing...'
    return 'Subscribe Now'
  }

  return (
    <div className="bg-white border border-[#E4E4E7] p-8 rounded-none shadow-[8px_8px_0px_#09090B] flex flex-col justify-between w-full min-h-[500px]">
      <div>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">
              Monthly Plan
            </h3>
            <h2 className="text-3xl font-extrabold text-[#09090B]">CleanQC Pro</h2>
          </div>
          <div className="text-right">
            <span className="font-mono text-3xl font-extrabold">$49</span>
            <span className="text-zinc-500 text-xs font-mono block">/month</span>
          </div>
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

      <div className="mt-auto">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
            {errorMsg}
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
    </div>
  )
}

export function PricingClient(props: PricingClientProps) {
  return (
    <Suspense fallback={
      <div className="w-full bg-white border border-[#E4E4E7] p-8 rounded-none shadow-[8px_8px_0px_#09090B] flex items-center justify-center min-h-[500px]">
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold">
          Loading checkout system...
        </span>
      </div>
    }>
      <PricingClientInner {...props} />
    </Suspense>
  )
}
