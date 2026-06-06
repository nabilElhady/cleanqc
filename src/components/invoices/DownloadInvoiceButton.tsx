'use client'

import React, { useEffect, useState } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { InvoicePDF, JobData } from './InvoicePDF'

interface DownloadInvoiceButtonProps {
  jobData: JobData
  fileName?: string
}

export function DownloadInvoiceButton({ 
  jobData, 
  fileName = 'invoice.pdf' 
}: DownloadInvoiceButtonProps) {
  // Prevent hydration mismatch by ensuring this only renders on the client
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    // Fallback skeleton or disabled button during SSR
    return (
      <button 
        disabled
        className="inline-flex items-center justify-center px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-zinc-400 bg-zinc-100 border border-zinc-200 cursor-not-allowed"
      >
        Initializing PDF...
      </button>
    )
  }

  return (
    <PDFDownloadLink
      document={<InvoicePDF jobData={jobData} />}
      fileName={fileName}
      className="inline-block"
    >
      {({ loading }) => (
        <button
          disabled={loading}
          className={`inline-flex items-center justify-center px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider transition-all border shadow-[2px_2px_0px_#FFFFFF] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
            ${loading 
              ? 'bg-zinc-200 text-zinc-500 border-zinc-300 cursor-wait' 
              : 'bg-[#09090B] text-white hover:bg-zinc-800 border-[#09090B] cursor-pointer'
            }`}
        >
          {loading ? 'Generating PDF...' : 'Download Invoice'}
        </button>
      )}
    </PDFDownloadLink>
  )
}
