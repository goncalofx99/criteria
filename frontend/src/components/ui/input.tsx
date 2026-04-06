import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          // Base
          'flex h-12 w-full rounded-md border bg-surface px-4 py-3 text-sm text-foreground',
          'placeholder:text-muted-foreground',
          // Default border
          'border-border',
          // Focus
          'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15',
          // Transition
          'transition-colors duration-150',
          // Disabled
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-overlay',
          // Error
          error && 'border-destructive focus:border-destructive focus:ring-destructive/15',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
