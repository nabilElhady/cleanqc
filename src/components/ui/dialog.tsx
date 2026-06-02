'use client'

import * as React from 'react'
import { X } from 'lucide-react'

export function Dialog({
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

export function DialogTrigger({
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

export function DialogContent({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  const { open, onOpenChange } = props as any
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative w-full max-w-lg bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl p-6 animate-in zoom-in-95 duration-200 text-[#09090B] z-10">
        <button
          onClick={() => onOpenChange?.(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity cursor-pointer text-[#71717A] hover:text-[#09090B]"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`} {...props} />
}

export function DialogTitle({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props} />
}

export function DialogDescription({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-[#71717A] ${className}`} {...props} />
}
