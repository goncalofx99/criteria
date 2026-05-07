import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-24 w-full rounded-md border bg-surface px-4 py-3 text-sm text-foreground',
        'placeholder:text-muted-foreground',
        'border-border',
        'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15',
        'transition-colors duration-150 leading-relaxed',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-overlay',
        error && 'border-destructive focus:border-destructive focus:ring-destructive/15',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
