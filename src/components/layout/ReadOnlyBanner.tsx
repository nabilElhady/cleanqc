'use client'

import { useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { X } from 'lucide-react'
import Link from 'next/link'

export function ReadOnlyBanner() {
  const { isReadOnly } = useSubscription()
  const [dismissed, setDismissed] = useState(false)

  if (!isReadOnly || dismissed) return null

  return (
    <div className="bg-[#09090B] text-white border-b border-[#E4E4E7] py-2 px-6 flex items-center justify-between text-xs font-mono tracking-wide relative z-40">
      <div className="flex-1 text-center pr-8">
        <span>READ-ONLY MODE: Your subscription is inactive. View historical data or </span>
        <Link href="/dashboard/billing" className="underline font-bold hover:text-zinc-300 transition-colors uppercase ml-1">
          upgrade to resume operations
        </Link>
        <span>.</span>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="text-zinc-400 hover:text-white transition-colors cursor-pointer absolute right-4 top-1/2 -translate-y-1/2"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
