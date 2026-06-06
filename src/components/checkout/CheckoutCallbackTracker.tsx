'use client'

import * as React from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, X } from 'lucide-react'

function TrackerInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [activeTxn, setActiveTxn] = React.useState<string | null>(null)
  const [email, setEmail] = React.useState<string | null>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    // 1. Check URL parameters
    const txn = searchParams.get('_ptxn')
    const customerEmail = searchParams.get('customer_email')

    if (txn) {
      // Save details to sessionStorage to show it even after redirecting
      try {
        sessionStorage.setItem(
          'cleanqc_checkout_success',
          JSON.stringify({ txn, email: customerEmail })
        )
      } catch (e) {
        console.error('Failed to write to sessionStorage:', e)
      }

      // Clean the URL by stripping the transaction parameters
      const newParams = new URLSearchParams(window.location.search)
      newParams.delete('_ptxn')
      newParams.delete('customer_email')
      
      const searchString = newParams.toString()
      const cleanPath = window.location.pathname + (searchString ? `?${searchString}` : '')
      
      // Clean query strings without page reload
      router.replace(cleanPath)

      // If on landing page, push user directly to their dashboard
      if (pathname === '/') {
        router.push('/dashboard')
      } else {
        // If already on the dashboard or another page, trigger the toast immediately
        setActiveTxn(txn)
        setEmail(customerEmail)
        setVisible(true)
        try {
          sessionStorage.removeItem('cleanqc_checkout_success')
        } catch (e) {}
      }
      return
    }

    // 2. Check sessionStorage if no parameters in URL (meaning we just redirected here)
    try {
      const stored = sessionStorage.getItem('cleanqc_checkout_success')
      if (stored) {
        const parsed = JSON.parse(stored)
        setActiveTxn(parsed.txn)
        setEmail(parsed.email)
        setVisible(true)
        sessionStorage.removeItem('cleanqc_checkout_success')
      }
    } catch (e) {
      console.error('Failed to read/parse sessionStorage:', e)
    }
  }, [searchParams, router, pathname])

  // Auto-dismiss after 8 seconds
  React.useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setVisible(false)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [visible])

  return (
    <AnimatePresence>
      {visible && activeTxn && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-none bg-[#09090B] text-white border border-[#E4E4E7]/10 p-5 shadow-[4px_4px_0px_rgba(9,9,11,0.2)] font-sans"
        >
          <div className="flex items-start gap-4">
            <div className="h-5 w-5 mt-0.5 shrink-0 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>

            <div className="flex-1 space-y-1">
              <h4 className="font-mono text-xs uppercase tracking-widest font-extrabold text-white">
                Payment Success
              </h4>
              <p className="text-[11px] font-mono text-zinc-400 leading-normal">
                Transaction ID: {activeTxn.slice(0, 18)}...
              </p>
              {email && (
                <p className="text-[11px] font-mono text-zinc-500 mt-1">
                  Email: {email}
                </p>
              )}
              <p className="text-xs text-zinc-300 font-medium pt-1">
                Your subscription has been successfully provisioned. Welcome to Crewmark Pro!
              </p>
            </div>

            <button
              onClick={() => setVisible(false)}
              className="text-zinc-500 hover:text-white transition-colors duration-150 p-1 -mr-1 cursor-pointer"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress Bar timer effect */}
          <motion.div 
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 8, ease: 'linear' }}
            className="absolute bottom-0 left-0 h-[2px] bg-emerald-500"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function CheckoutCallbackTracker() {
  return (
    <React.Suspense fallback={null}>
      <TrackerInner />
    </React.Suspense>
  )
}
