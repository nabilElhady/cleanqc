'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

function AuthConfirmHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const hasHashToken = hash.includes('access_token=')

    // Set a 5-second timeout fallback in case the SIGNED_IN event never fires (e.g. invalid hash token)
    const timeoutId = setTimeout(() => {
      if (hasHashToken) {
        setError('Authentication timed out. Please try logging in directly.')
        router.replace('/login?error=Authentication+timeout')
      }
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        clearTimeout(timeoutId)
        
        // Fetch user profile to redirect correctly based on role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile?.role === 'crew') {
          router.replace('/crew/jobs')
        } else {
          router.replace('/dashboard')
        }
        
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
              
              if (codeData?.user) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', codeData.user.id)
                  .single()

                router.replace(profile?.role === 'crew' ? '/crew/jobs' : '/dashboard')
              } else {
                router.replace('/login')
              }
              subscription.unsubscribe()
              return
            }

            if (token_hash && type) {
              const { data: otpData, error: verifyErr } = await supabase.auth.verifyOtp({
                type: type as any,
                token_hash,
              })
              if (verifyErr) throw verifyErr
              
              if (otpData?.user) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', otpData.user.id)
                  .single()

                router.replace(profile?.role === 'crew' ? '/crew/jobs' : '/dashboard')
              } else {
                router.replace('/login')
              }
              subscription.unsubscribe()
              return
            }

            // Check if there is an error code/description in the hash fragment
            if (hash.includes('error=')) {
              const params = new URLSearchParams(hash.replace('#', ''))
              const errMsg = params.get('error_description') || params.get('error') || 'Verification failed'
              throw new Error(errMsg)
            } else {
              throw new Error('Invalid invitation link')
            }
          } catch (err: any) {
            const errMsg = err.message || 'Verification failed'
            setError(errMsg)
            router.replace(`/login?error=${encodeURIComponent(errMsg)}`)
          }
          subscription.unsubscribe()
        }
      }
    })

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [router, searchParams])

  return (
    <div className="relative text-center z-10 space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-black mx-auto" />
      <h2 className="text-xl font-bold font-mono tracking-tight text-black">
        {error ? 'VERIFICATION FAILED' : 'CONFIRMING INVITATION...'}
      </h2>
      <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
        {error ? error : 'Please wait while we set up your session.'}
      </p>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#FFFFFF] px-4">
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
