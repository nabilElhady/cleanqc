'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface PricingClientProps {
  isAuthenticated: boolean
  userRole: string | null
  orgId: string | null
  features: string[]
  paddleClientToken: string
  paddlePriceId: string
  paddleEnv: string
}

declare global {
  interface Window {
    Paddle?: any;
  }
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Initialize Paddle.js
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Paddle) {
      window.Paddle.Environment.set(paddleEnv === 'sandbox' ? 'sandbox' : 'production')
      window.Paddle.Initialize({
        token: paddleClientToken,
        eventCallback: function(data: any) {
          console.log('Paddle Event:', data)
        }
      })
    }
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

      if (data.checkoutUrl) {
        // Redirection to Paddle Hosted Checkout
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('No checkout URL received from server.')
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
    if (trigger === 'checkout' && isAuthenticated && userRole === 'owner') {
      // Remove trigger param from the URL right away to avoid duplicate trigger on reload
      const newParams = new URLSearchParams(window.location.search)
      newParams.delete('trigger')
      const searchString = newParams.toString()
      const cleanPath = window.location.pathname + (searchString ? `?${searchString}` : '')
      router.replace(cleanPath)

      // Execute payment creation
      handleSubscribe()
    }
  }, [searchParams, isAuthenticated, userRole])

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
          disabled={loading}
          className="w-full bg-[#09090B] text-white hover:bg-zinc-800 disabled:bg-zinc-400 py-4 px-6 font-mono text-sm uppercase tracking-wider font-bold transition-all duration-150 flex items-center justify-center border border-[#09090B] shadow-[2px_2px_0px_#FFFFFF] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          {loading ? 'Processing...' : 'Subscribe Now'}
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
