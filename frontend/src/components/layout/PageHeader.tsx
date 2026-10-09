import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Sticky page header below the persistent phone brand bar. The brand bar owns
 * the safe-area inset; this offset keeps both controls visible while scrolling.
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
        'sticky top-[calc(56px+env(safe-area-inset-top))] z-30 border-b border-border/70 bg-surface/90 backdrop-blur-xl md:relative md:top-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}
