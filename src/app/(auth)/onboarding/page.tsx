'use client'

import { useActionState, Suspense } from 'react'
import { completeGoogleOnboarding } from '@/app/actions/auth'
import { Building, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'

const inputClass = "block w-full pl-10 pr-4 py-3 bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] placeholder-[#71717A] focus:outline-none focus:border-[#09090B] transition-colors text-sm disabled:opacity-50"

function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(completeGoogleOnboarding, {})

  return (
    <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-8">
      <form action={formAction} className="space-y-6">
        {state.error && (
          <div className="flex items-start gap-3 bg-[#FFFFFF] border border-red-500 p-4 text-sm text-red-500 animate-in fade-in duration-200">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-left">Setup failed</span>
              <p className="mt-0.5 text-left">{state.error}</p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="orgName" className="block text-left text-sm font-bold text-[#09090B] mb-2">
            Organization Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building className="h-5 w-5 text-[#71717A]" />
            </div>
            <input 
              id="orgName" 
              name="orgName" 
              type="text" 
              autoComplete="organization" 
              required 
              placeholder="e.g. Apex Cleaning Co." 
              disabled={isPending} 
              className={inputClass} 
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="relative w-full h-12 flex items-center justify-center bg-[#09090B] hover:bg-[#09090B]/90 text-[#FFFFFF] font-bold text-[11px] uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer mt-2"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Complete Setup'}
        </button>
      </form>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#FFFFFF] py-12 px-4 sm:px-6 relative">
      {/* Crisp Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 bg-[#09090B] flex items-center justify-center mb-6">
            <Sparkles className="h-6 w-6 text-[#FFFFFF]" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-[#09090B]">Welcome to Crewmark</h2>
          <p className="mt-2 text-sm text-[#71717A] font-medium">Please enter your company name to finish setting up your account.</p>
        </div>

        <Suspense fallback={
          <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-8 flex items-center justify-center h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-[#71717A]" />
          </div>
        }>
          <OnboardingForm />
        </Suspense>
      </div>
    </div>
  )
}
