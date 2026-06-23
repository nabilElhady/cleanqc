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
        className="inline-block bg-[#09090B] text-white font-mono text-xs tracking-widest uppercase px-6 py-3 font-bold border border-[#09090B] hover:bg-white hover:text-[#09090B] transition-colors rounded-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Opening Portal…' : 'Manage Subscription'}
      </button>

      {errorMsg && (
        <p className="text-red-500 font-mono text-xs mt-2 max-w-sm break-words">{errorMsg}</p>
      )}
    </div>
  )
}
