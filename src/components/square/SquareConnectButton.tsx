'use client'

import React, { useState } from 'react'

interface SquareConnectButtonProps {
  isConnected: boolean
}

export function SquareConnectButton({ isConnected }: SquareConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConnect = () => {
    setIsLoading(true)
    // Redirect the user to our connect endpoint, which initiates the OAuth flow
    window.location.href = '/api/square/connect'
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-4 p-4 border border-green-200 bg-green-50 rounded-md">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        <span className="font-semibold text-green-800">Square Connected</span>
        <span className="text-sm text-green-700 ml-auto">Ready to issue invoices.</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className={`inline-flex items-center justify-center px-6 py-3 font-mono text-sm font-bold tracking-wider transition-all border shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
        ${isLoading 
          ? 'bg-zinc-200 text-zinc-500 border-zinc-300 cursor-wait' 
          : 'bg-white text-[#18181b] hover:bg-zinc-50 border-[#18181b] cursor-pointer'
        }`}
    >
      {isLoading ? 'Connecting...' : 'Connect Square Account'}
    </button>
  )
}
