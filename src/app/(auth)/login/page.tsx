'use client'

import { useActionState, Suspense } from 'react'
import { signInWithPassword } from '@/app/actions/auth'
import { Mail, Lock, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const inputClass = "block w-full pl-10 pr-4 py-3 bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] placeholder-[#71717A] focus:outline-none focus:border-[#09090B] transition-colors text-sm disabled:opacity-50"

function LoginForm() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const redirectParam = searchParams.get('redirect')
  const [state, formAction, isPending] = useActionState(signInWithPassword, {})

  return (
    <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-8">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="redirect" value={redirectParam || ''} />
        {(state.error || errorParam) && (
          <div className="flex items-start gap-3 bg-[#FFFFFF] border border-red-500 p-4 text-sm text-red-500 animate-in fade-in duration-200">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-left">Authentication failed</span>
              <p className="mt-0.5 text-left">
                {state.error || (errorParam === 'Invalid Link' ? 'The verification link is expired or invalid.' : errorParam)}
              </p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-left text-sm font-bold text-[#09090B] mb-2">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-[#71717A]" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@company.com"
              disabled={isPending}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-left text-sm font-bold text-[#09090B] mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-[#71717A]" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              disabled={isPending}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="relative w-full h-12 flex items-center justify-center bg-[#09090B] hover:bg-[#09090B]/90 text-[#FFFFFF] font-bold text-[11px] uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-[#71717A] font-medium">
        Don't have an account?{' '}
        <Link href={`/signup${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`} className="text-[#09090B] hover:underline font-bold transition-colors">
          Sign Up
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#FFFFFF] px-4 sm:px-6 relative">
      {/* Crisp Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 bg-[#09090B] flex items-center justify-center mb-6">
            <Sparkles className="h-6 w-6 text-[#FFFFFF]" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-[#09090B]">CleanQC</h2>
          <p className="mt-2 text-sm text-[#71717A] font-medium">Sign in to access your dashboard</p>
        </div>

        <Suspense fallback={
          <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-8 flex items-center justify-center h-[260px]">
            <Loader2 className="h-8 w-8 animate-spin text-[#71717A]" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
          By signing in, you agree to our{' '}
          <Link href="#" className="text-[#09090B] hover:underline transition-colors">Terms of Service</Link>{' '}
          and{' '}
          <Link href="#" className="text-[#09090B] hover:underline transition-colors">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
