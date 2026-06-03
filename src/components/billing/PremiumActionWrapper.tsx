'use client'

import React from 'react'
import { useSubscription } from '@/hooks/useSubscription'

interface PremiumActionWrapperProps {
  children: React.ReactElement<any>
}

export function PremiumActionWrapper({ children }: PremiumActionWrapperProps) {
  const { isReadOnly, openUpgradeModal } = useSubscription()

  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      if (isReadOnly) {
        e.preventDefault()
        e.stopPropagation()
        openUpgradeModal()
      } else if (children.props.onClick) {
        children.props.onClick(e)
      }
    },
  })
}
