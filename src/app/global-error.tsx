'use client'

import { useEffect } from 'react'

// global-error must include the html and body tags since it replaces the root layout on fatal crashes
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 1. Secure Logging: Capture the root-level fatal crash directly into Vercel logs
    console.error('[CRITICAL SECURITY AUDIT] Global Fatal Error Boundary Triggered:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900">Critical System Error</h1>
          
          {/* 2. Error Masking: Completely hide the underlying framework failure from the DOM payload */}
          <p className="text-gray-600 max-w-lg">
            A fatal error prevented the application from loading. The issue has been securely logged to our infrastructure monitoring. Please try refreshing the page.
          </p>
          
          <button
            onClick={() => reset()}
            className="px-8 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors focus:ring-4 focus:ring-red-200"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
