'use client'

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center p-8 bg-[#FAFAFA] text-[#09090B]">
      <h1 className="text-2xl font-black tracking-tight">You're offline</h1>
      <p className="text-[#71717A] text-sm">Check your internet connection and try again.</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 bg-[#09090B] text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#27272A] transition-colors"
      >
        Retry
      </button>
    </div>
  )
}
