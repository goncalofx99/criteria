import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { tabs } from './navigation'

export function BottomNav() {
  return (
    <nav
      aria-label="Primary navigation"
      className="mobile-nav fixed bottom-0 left-0 right-0 z-50 flex justify-center border-t border-border bg-surface/95 backdrop-blur-xl"
      style={{ paddingBottom: 'min(env(safe-area-inset-bottom), 12px)' }}
    >
      <div className="w-full max-w-app flex items-end px-3">
        {tabs.map(({ to, icon: Icon, label, primary }) => (
          <NavLink
            key={to}
            to={to}
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-1"
          >
            {({ isActive }) =>
              primary ? (
                <>
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                      isActive ? 'bg-primary-700' : 'bg-primary',
                    )}
                  >
                    <Icon size={19} className="text-white" strokeWidth={2.2} />
                  </span>
                  <span className={cn('text-[11px] leading-none', isActive ? 'font-semibold text-primary' : 'text-muted-foreground')}>{label}</span>
                </>
              ) : (
                <>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className={cn(isActive ? 'text-primary' : 'text-muted-foreground')}
                  />
                  <span
                    className={cn(
                      'text-[11px] leading-none',
                      isActive ? 'font-semibold text-primary' : 'font-normal text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
