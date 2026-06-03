'use client'

import { useSubscription } from '@/hooks/useSubscription'
import { X } from 'lucide-react'

export function UpgradeModal() {
  const { isUpgradeModalOpen, closeUpgradeModal } = useSubscription()

  if (!isUpgradeModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Backdrop Closer */}
      <div className="absolute inset-0" onClick={closeUpgradeModal} />

      <div className="bg-white border border-[#E4E4E7] p-8 w-full max-w-md relative rounded-none shadow-[8px_8px_0px_#09090B] animate-in fade-in zoom-in-95 duration-150 z-10">
        <button
          onClick={closeUpgradeModal}
          className="absolute top-4 right-4 text-zinc-400 hover:text-[#09090B] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <span className="font-mono text-xs uppercase tracking-widest text-red-600 font-bold block mb-2">
            Action Locked
          </span>
          <h3 className="text-xl font-black text-[#09090B] tracking-tight">
            Subscription Required
          </h3>
          <p className="text-zinc-600 text-sm mt-3 leading-relaxed font-medium">
            Your trial has expired. Upgrade to CleanQC Pro to dispatch new jobs and create templates.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            onClick={closeUpgradeModal}
            className="flex-1 border border-[#E4E4E7] bg-white hover:bg-zinc-50 text-zinc-500 hover:text-[#09090B] py-3 px-4 font-mono text-xs uppercase tracking-widest font-bold transition-all duration-150 rounded-none cursor-pointer text-center"
          >
            Cancel
          </button>
          <a
            href="/pricing"
            className="flex-1 bg-[#09090B] text-white hover:bg-zinc-800 py-3 px-4 font-mono text-xs uppercase tracking-widest font-bold transition-all duration-150 rounded-none flex items-center justify-center border border-[#09090B] cursor-pointer text-center"
          >
            Upgrade System
          </a>
        </div>
      </div>
    </div>
  )
}
