'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Already installed?
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // iOS detection
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream
    setIsIOS(ios)

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Already installed
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
    })

    // Don't show again if user dismissed recently
    const dismissedAt = localStorage.getItem('pwa-install-dismissed')
    if (dismissedAt) {
      const daysSince =
        (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) setDismissed(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'dismissed') handleDismiss()
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', String(Date.now()))
  }

  // Don't render if installed, or dismissed, or no prompt available and not iOS
  if (isStandalone || dismissed) return null
  if (!deferredPrompt && !isIOS) return null

  return (
    <div
      role="banner"
      aria-label="Install app"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#FFFFFF] border border-[#E4E4E7] p-4 flex flex-col gap-2 max-w-[360px] w-[90vw] z-[9999]"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
    >
      <p className="m-0 font-bold text-sm text-[#09090B]">Install the app</p>
      {isIOS ? (
        <p className="m-0 text-sm text-[#71717A]">
          Tap <strong className="text-[#09090B]">Share</strong> then <strong className="text-[#09090B]">"Add to Home Screen"</strong>
        </p>
      ) : (
        <div className="flex gap-2 mt-1">
          <button
            onClick={handleInstall}
            className="bg-[#09090B] text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#27272A] transition-colors flex-1"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="bg-transparent text-[#09090B] border border-[#E4E4E7] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#FAFAFA] transition-colors flex-1"
          >
            Not now
          </button>
        </div>
      )}
      {isIOS && (
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-[#71717A] hover:text-[#09090B]"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}
