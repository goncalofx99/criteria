import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Sticky page header that respects the iOS notch / status bar inset.
 * The wrapper holds the safe-area padding; children render the actual row(s).
 */
export function PageHeader({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'sticky top-0 z-40 bg-surface border-b border-border/70',
        className,
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {children}
    </div>
  )
}
