import React from 'react'
import { getSubscriptionServer } from '@/lib/subscription'
import { SubscriptionProvider } from '@/hooks/useSubscription'
import { ReadOnlyBanner } from '@/components/layout/ReadOnlyBanner'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import DashboardLayoutClient from './DashboardLayoutClient'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { subscriptionStatus, isAdmin } = await getSubscriptionServer()

  return (
    <SubscriptionProvider initialStatus={subscriptionStatus} isAdmin={isAdmin}>
      <div className="flex flex-col min-h-screen">
        <ReadOnlyBanner />
        <DashboardLayoutClient isAdmin={isAdmin}>
          {children}
        </DashboardLayoutClient>
        <UpgradeModal />
      </div>
    </SubscriptionProvider>
  )
}
