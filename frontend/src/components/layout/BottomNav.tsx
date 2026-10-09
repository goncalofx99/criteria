import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { tabs } from './navigation'

export function BottomNav() {
  return (
    <nav
      aria-label="Primary navigation"
      className="mobile-nav fixed bottom-0 left-0 right-0 z-50 flex justify-center border-t border-border bg-surface/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex w-full max-w-app items-center px-2">
        {tabs.map(({ to, icon: Icon, label, primary }) => (
          <NavLink
            key={to}
            to={to}
            className="flex min-h-[64px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1"
          >
            {({ isActive }) => (
              <>
                <span className={cn(
                  'flex h-8 w-9 items-center justify-center rounded-full transition-colors',
                  primary ? (isActive ? 'bg-primary-700 text-white' : 'bg-primary text-white') : (isActive ? 'bg-primary-100 text-primary' : 'text-muted-foreground'),
                )}>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
                </span>
                <span className={cn('text-[11px] leading-none', isActive ? 'font-semibold text-primary' : 'text-muted-foreground')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
