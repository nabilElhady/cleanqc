'use client'

import React, { createContext, useContext, useState } from 'react'

export interface SubscriptionContextType {
  subscriptionStatus: string | null
  isPremium: boolean
  isReadOnly: boolean
  isUpgradeModalOpen: boolean
  openUpgradeModal: () => void
  closeUpgradeModal: () => void
  isAdmin: boolean
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({
  children,
  initialStatus,
  isAdmin = false,
}: {
  children: React.ReactNode
  initialStatus: string | null
  isAdmin?: boolean
}) {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)

  const isPremium = initialStatus === 'active' || initialStatus === 'trialing' || isAdmin
  const isReadOnly = !isPremium

  const openUpgradeModal = () => setIsUpgradeModalOpen(true)
  const closeUpgradeModal = () => setIsUpgradeModalOpen(false)

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptionStatus: initialStatus,
        isPremium,
        isReadOnly,
        isUpgradeModalOpen,
        openUpgradeModal,
        closeUpgradeModal,
        isAdmin,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
