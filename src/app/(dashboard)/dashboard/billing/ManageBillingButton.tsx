'use client'

import React, { useState } from 'react'
import { getCustomerPortalUrl } from '@/app/actions/billing'

export default function ManageBillingButton() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handlePortalRedirect = async () => {
    setLoading(true)
    setErrorMsg(null)

    try {
      const result = await getCustomerPortalUrl()

      if (result?.error) {
        setErrorMsg(result.error)
      } else if (result?.url) {
        window.location.href = result.url
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        id="manage-subscription-btn"
        onClick={handlePortalRedirect}
        disabled={loading}
        className="inline-block bg-[#09090B] text-white text-xs tracking-widest uppercase px-6 py-3 font-bold hover:bg-[#27272A] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-200 rounded-full cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
      >
        {loading ? 'Opening Portal…' : 'Manage Subscription'}
      </button>

      {errorMsg && (
        <p className="text-red-500 text-xs font-bold mt-2 max-w-sm break-words">{errorMsg}</p>
      )}
    </div>
  )
}
