'use client'

import * as React from 'react'
import { X } from 'lucide-react'

export function Sheet({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <div data-state={open ? 'open' : 'closed'}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { open, onOpenChange } as any)
        }
        return child
      })}
    </div>
  )
}

export function SheetTrigger({
  children,
  asChild,
  ...props
}: {
  children: React.ReactNode
  asChild?: boolean
  [key: string]: any
}) {
  const { onOpenChange } = props as any
  return React.cloneElement(children as React.ReactElement<any>, {
    onClick: (e: any) => {
      if (onOpenChange) onOpenChange(true)
      if (children && (children as any).props.onClick) {
        ;(children as any).props.onClick(e)
      }
    },
  })
}

export function SheetContent({
  children,
  side = 'left',
  ...props
}: {
  children: React.ReactNode
  side?: 'left' | 'right'
  [key: string]: any
}) {
  const { open, onOpenChange } = props as any
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        className={`relative flex w-full max-w-[280px] flex-col bg-[#FFFFFF] p-6 border-r border-[#E4E4E7] animate-in slide-in-from-left duration-250`}
      >
        <button
          onClick={() => onOpenChange?.(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity cursor-pointer text-[#71717A] hover:text-[#09090B]"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-2 text-left ${className}`} {...props} />
}

export function SheetTitle({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-lg font-semibold text-[#09090B] ${className}`} {...props} />
}
export function SheetDescription({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-[#71717A] ${className}`} {...props} />
}
