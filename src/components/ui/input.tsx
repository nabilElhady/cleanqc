import * as React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={`flex h-10 w-full rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] px-3 py-2 text-sm text-[#09090B] placeholder-[#71717A] focus:outline-none focus:ring-1 focus:ring-[#09090B]/20 focus:border-[#09090B] disabled:cursor-not-allowed disabled:opacity-50 transition-all ${className}`}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'
