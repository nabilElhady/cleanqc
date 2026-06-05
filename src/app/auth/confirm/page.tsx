'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Sparkles, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function AuthConfirmHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const hasHashToken = hash.includes('access_token=')

    // Set a 5-second timeout fallback in case the SIGNED_IN event never fires (e.g. invalid hash token)
    const timeoutId = setTimeout(() => {
      if (hasHashToken) {
        setError('Authentication timed out. Please try logging in directly.')
      }
    }, 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        clearTimeout(timeoutId)
        setIsConfirmed(true)
        subscription.unsubscribe()
      } else if (event === 'INITIAL_SESSION') {
        // Only run check immediately if we are NOT waiting for an implicit hash token exchange
        if (!session && !hasHashToken) {
          clearTimeout(timeoutId)
          
          const token_hash = searchParams.get('token_hash')
          const type = searchParams.get('type')
          const code = searchParams.get('code')

          try {
            if (code) {
              const { data: codeData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
              if (exchangeErr) throw exchangeErr
              
              setIsConfirmed(true)
              subscription.unsubscribe()
              return
            }

            if (token_hash && type) {
              const { data: otpData, error: verifyErr } = await supabase.auth.verifyOtp({
                type: type as any,
                token_hash,
              })
              if (verifyErr) throw verifyErr
              
              setIsConfirmed(true)
              subscription.unsubscribe()
              return
            }

            // Check if there is an error code/description in the hash fragment
            if (hash.includes('error=')) {
              const params = new URLSearchParams(hash.replace('#', ''))
              const errMsg = params.get('error_description') || params.get('error') || 'Verification failed'
              throw new Error(errMsg)
            } else {
              throw new Error('Invalid or expired confirmation link.')
            }
          } catch (err: any) {
            const errMsg = err.message || 'Verification failed'
            setError(errMsg)
          }
          subscription.unsubscribe()
        } else if (session) {
          // User is already logged in/session exists
          clearTimeout(timeoutId)
          setIsConfirmed(true)
          subscription.unsubscribe()
        }
      }
    })

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [router, searchParams])

  if (isConfirmed) {
    return (
      <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-8 text-center space-y-6 w-full max-w-md shadow-[4px_4px_0px_#09090B] z-10 animate-in fade-in duration-200">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 bg-white border border-[#E4E4E7] flex items-center justify-center rounded-none shadow-[4px_4px_0px_#09090B] mb-4">
            <Sparkles className="h-6 w-6 text-[#09090B]" />
          </div>
          <h3 className="text-lg font-black text-[#09090B] uppercase tracking-wider">Account Verified</h3>
          <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
            Your CleanQC account has been successfully activated. You can now sign in to your workspace dashboard.
          </p>
        </div>
        <div className="pt-4 border-t border-[#E4E4E7]">
          <Link
            href="/login"
            className="w-full h-12 flex items-center justify-center bg-[#09090B] hover:bg-[#09090B]/90 text-white font-bold text-[11px] uppercase tracking-widest transition-colors cursor-pointer"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-8 text-center space-y-6 w-full max-w-md shadow-[4px_4px_0px_#EF4444] z-10 animate-in fade-in duration-200">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 bg-white border border-[#EF4444] flex items-center justify-center rounded-none shadow-[4px_4px_0px_#EF4444] mb-4">
            <AlertCircle className="h-6 w-6 text-[#EF4444]" />
          </div>
          <h3 className="text-lg font-black text-[#EF4444] uppercase tracking-wider">Verification Failed</h3>
          <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
            {error}
          </p>
        </div>
        <div className="pt-4 border-t border-[#E4E4E7]">
          <Link
            href="/login"
            className="w-full h-12 flex items-center justify-center bg-[#09090B] hover:bg-[#09090B]/90 text-white font-bold text-[11px] uppercase tracking-widest transition-colors cursor-pointer"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative text-center z-10 space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-black mx-auto" />
      <h2 className="text-xl font-bold font-mono tracking-tight text-black">
        CONFIRMING INVITATION...
      </h2>
      <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
        Please wait while we set up your session.
      </p>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#FFFFFF] px-4 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <Suspense fallback={
        <div className="relative text-center z-10 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-black mx-auto" />
          <h2 className="text-xl font-bold font-mono tracking-tight text-black">
            LOADING AUTHENTICATION...
          </h2>
        </div>
      }>
        <AuthConfirmHandler />
      </Suspense>
    </div>
  )
}
