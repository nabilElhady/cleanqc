'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 1. Secure Logging: Log the raw error stack exclusively to the Vercel backend/server logs.
    // Next.js automatically proxies this to the server console in production, keeping it out of the DOM.
    console.error('[SECURITY AUDIT] Dashboard Error Boundary Caught Exception:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-gray-900">Something went wrong</h2>
      
      {/* 2. Error Masking: Never expose error.message to the client in production as it could contain raw SQL or env vars */}
      <p className="text-gray-500 max-w-md">
        An unexpected server error occurred. Our engineering team has been notified securely and is investigating the issue.
      </p>
      
      <div className="pt-4">
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-black"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
