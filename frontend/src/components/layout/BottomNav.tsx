import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { mobileTabs } from './navigation'

export function BottomNav() {
  return (
    <nav
      aria-label="Primary navigation"
      className="mobile-nav fixed bottom-0 left-0 right-0 z-50 flex justify-center border-t border-border bg-surface/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid w-full max-w-app grid-cols-3 items-center px-3">
        {mobileTabs.map(({ to, icon: Icon, label, primary }) => (
          <NavLink
            key={to}
            to={to}
            className="flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-colors hover:bg-overlay"
          >
            {({ isActive }) => (
              <>
                <span className={cn(
                  'flex items-center justify-center rounded-full transition-colors',
                  primary
                    ? 'h-11 w-11 bg-primary text-primary-foreground shadow-sm'
                    : 'h-9 w-11',
                  !primary && (isActive ? 'bg-primary-100 text-primary' : 'text-muted-foreground'),
                )}>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.3 : 1.8} aria-hidden="true" />
                </span>
                <span className={cn('text-[11px] leading-none', isActive || primary ? 'font-semibold text-primary' : 'text-muted-foreground')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
