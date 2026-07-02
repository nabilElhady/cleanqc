import * as React from 'react'
import { cn } from '@/lib/utils'

export type StatusPillVariant = 'pending' | 'in_progress' | 'completed' | 'active' | 'inactive' | 'default'

interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusPillVariant
  children: React.ReactNode
}

export function StatusPill({ variant = 'default', className, children, ...props }: StatusPillProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-1 shrink-0 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-full transition-colors'
  
  const variantStyles = {
    pending: 'bg-[#FAFAFA] text-[#A1A1AA] border-[#E4E4E7]',
    in_progress: 'bg-[#F4F4F5] text-[#09090B] border-[#E4E4E7]',
    completed: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20',
    active: 'bg-green-600/10 text-green-600 border-green-600 animate-pulse',
    inactive: 'bg-[#FAFAFA] text-[#71717A] border-[#E4E4E7]',
    default: 'bg-slate-100 text-slate-600 border-transparent',
  }

  return (
    <span className={cn(baseStyles, variantStyles[variant], className)} {...props}>
      {children}
    </span>
  )
}
