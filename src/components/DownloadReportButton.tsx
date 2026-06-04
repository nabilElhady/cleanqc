'use client'

import * as React from 'react'
import { FileText, Loader2 } from 'lucide-react'

interface DownloadReportButtonProps {
  jobId: string
  className?: string
}

export default function DownloadReportButton({ jobId, className = '' }: DownloadReportButtonProps) {
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleDownload = async () => {
    setIsDownloading(true)
    setError(null)

    try {
      const response = await fetch(`/api/reports/generate?job_id=${jobId}`)
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to generate report PDF.')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const downloadLink = document.createElement('a')
      downloadLink.href = downloadUrl
      downloadLink.setAttribute('download', `CleanQC-Report-${jobId}.pdf`)
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.parentNode?.removeChild(downloadLink)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: any) {
      console.error('Download report error:', err)
      setError(err.message || 'Failed to download report.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className={`w-full sm:w-auto border border-black bg-white hover:bg-black hover:text-white disabled:bg-zinc-100 disabled:text-zinc-400 py-3 px-6 font-mono text-xs font-black tracking-widest uppercase transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer rounded-none border-t-2 border-l-2 border-b-4 border-r-4 ${className}`}
      >
        {isDownloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-black" />
            <span>DOWNLOADING REPORT...</span>
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            <span>DOWNLOAD PDF REPORT</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-wider">
          {error}
        </p>
      )}
    </div>
  )
}
