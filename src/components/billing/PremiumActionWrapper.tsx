'use client'

import React from 'react'
import { useSubscription } from '@/hooks/useSubscription'

interface PremiumActionWrapperProps {
  children: React.ReactElement<any>
  ref?: any
}

export function PremiumActionWrapper({ children, ref, ...props }: PremiumActionWrapperProps & Record<string, any>) {
  const { isReadOnly, openUpgradeModal } = useSubscription()

  return React.cloneElement(children, {
    ...props,
    ref: (node: any) => {
      // Handle ref forwarding from Radix DialogTrigger (ref as a prop in React 19)
      if (ref) {
        if (typeof ref === 'function') {
          ref(node)
        } else {
          ref.current = node
        }
      }
      // Handle child's own ref if it exists
      const childRef = (children as any).ref
      if (childRef) {
        if (typeof childRef === 'function') {
          childRef(node)
        } else {
          childRef.current = node
        }
      }
    },
    onClick: (e: React.MouseEvent) => {
      if (isReadOnly) {
        e.preventDefault()
        e.stopPropagation()
        openUpgradeModal()
      } else {
        if (props.onClick) {
          props.onClick(e)
        }
        if (children.props.onClick) {
          children.props.onClick(e)
        }
      }
    },
  })
}
