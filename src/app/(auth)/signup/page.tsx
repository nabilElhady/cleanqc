'use client'

import { useActionState, Suspense } from 'react'
import { signUpWithOwner } from '@/app/actions/auth'
import { User, Mail, Lock, Building, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const inputClass = "block w-full pl-10 pr-4 py-3 bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] placeholder-[#71717A] focus:outline-none focus:border-[#09090B] transition-colors text-sm disabled:opacity-50"

function SignupForm() {
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const [state, formAction, isPending] = useActionState(signUpWithOwner, {})

  const fields = [
    { id: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', autoComplete: 'name', Icon: User },
    { id: 'orgName', label: 'Organization Name', type: 'text', placeholder: 'e.g. Apex Cleaning Co.', autoComplete: 'organization', Icon: Building },
    { id: 'email', label: 'Email Address', type: 'email', placeholder: 'name@company.com', autoComplete: 'email', Icon: Mail },
    { id: 'password', label: 'Password', type: 'password', placeholder: '••••••••', autoComplete: 'new-password', Icon: Lock },
  ]

  return (
    <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-8">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="redirect" value={redirectParam || ''} />
        {state.error && (
          <div className="flex items-start gap-3 bg-[#FFFFFF] border border-red-500 p-4 text-sm text-red-500 animate-in fade-in duration-200">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-left">Registration failed</span>
              <p className="mt-0.5 text-left">{state.error}</p>
            </div>
          </div>
        )}

        {fields.map(({ id, label, type, placeholder, autoComplete, Icon }) => (
          <div key={id}>
            <label htmlFor={id} className="block text-left text-sm font-bold text-[#09090B] mb-2">{label}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon className="h-5 w-5 text-[#71717A]" />
              </div>
              <input id={id} name={id} type={type} autoComplete={autoComplete} required placeholder={placeholder} disabled={isPending} className={inputClass} />
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={isPending}
          className="relative w-full h-12 flex items-center justify-center bg-[#09090B] hover:bg-[#09090B]/90 text-[#FFFFFF] font-bold text-[11px] uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer mt-2"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-[#71717A] font-medium">
        Already have an account?{' '}
        <Link href={`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`} className="text-[#09090B] hover:underline font-bold transition-colors">
          Sign In
        </Link>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#FFFFFF] py-12 px-4 sm:px-6 relative">
      {/* Crisp Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 bg-[#09090B] flex items-center justify-center mb-6">
            <Sparkles className="h-6 w-6 text-[#FFFFFF]" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-[#09090B]">CleanQC</h2>
          <p className="mt-2 text-sm text-[#71717A] font-medium">Create an owner account and register your business</p>
        </div>

        <Suspense fallback={
          <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-8 flex items-center justify-center h-[340px]">
            <Loader2 className="h-8 w-8 animate-spin text-[#71717A]" />
          </div>
        }>
          <SignupForm />
        </Suspense>

        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
          By signing up, you agree to our{' '}
          <Link href="#" className="text-[#09090B] hover:underline transition-colors">Terms of Service</Link>{' '}
          and{' '}
          <Link href="#" className="text-[#09090B] hover:underline transition-colors">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
