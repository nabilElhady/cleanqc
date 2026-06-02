import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', asChild = false, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#09090B]/20 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 cursor-pointer uppercase tracking-widest'
    let variantStyles = ''

    if (variant === 'default') {
      variantStyles =
        'bg-[#09090B] text-white hover:bg-[#18181B] border border-[#09090B]'
    } else if (variant === 'outline') {
      variantStyles =
        'border border-[#E4E4E7] bg-transparent text-[#09090B] hover:bg-[#FAFAFA]'
    } else if (variant === 'ghost') {
      variantStyles = 'text-[#71717A] hover:bg-[#FAFAFA] hover:text-[#09090B]'
    } else if (variant === 'destructive') {
      variantStyles = 'bg-rose-500 text-white hover:bg-rose-600 border border-rose-600'
    }

    const combinedClassName = `${baseStyles} ${variantStyles} ${className}`

    if (asChild && React.isValidElement(props.children)) {
      const child = props.children as React.ReactElement<any>
      return React.cloneElement(child, {
        className: `${combinedClassName} ${child.props.className || ''}`,
      })
    }

    return (
      <button
        ref={ref}
        className={combinedClassName}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
