'use client'

import { useState } from 'react'
import { signInWithGoogle } from '@/app/actions/auth'
import { Loader2 } from 'lucide-react'

interface GoogleSignInButtonProps {
  /** Optional path to redirect after successful sign-in (e.g. '/dashboard/team') */
  next?: string
  className?: string
}

// Google "G" Logo SVG — official brand asset proportions
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

/**
 * Reusable "Sign in with Google" button.
 *
 * Calls the signInWithGoogle server action, then immediately redirects
 * the browser to the Google OAuth consent page via window.location.href
 * (NOT router.push, which is intercepted by Next.js client navigation).
 */
export function GoogleSignInButton({ next, className }: GoogleSignInButtonProps) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setIsPending(true)
    setError(null)

    try {
      const result = await signInWithGoogle(next)

      if (result.error || !result.url) {
        setError(result.error || 'Could not connect to Google. Please try again.')
        setIsPending(false)
        return
      }

      // Hard redirect to the Google OAuth page — must bypass Next.js router
      window.location.href = result.url
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.')
      setIsPending(false)
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          className ??
          'relative w-full h-12 flex items-center justify-center gap-3 bg-[#FFFFFF] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-[#09090B] font-bold text-[11px] uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
        }
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <GoogleLogo className="h-5 w-5 shrink-0" />
            <span>Sign in with Google</span>
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-500 text-center font-medium">{error}</p>
      )}
    </div>
  )
}
