import { NavLink } from 'react-router-dom'
import { LayoutGrid, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/feed',    icon: LayoutGrid, label: 'Feed' },
  { to: '/create',  icon: Plus,       label: 'Post', primary: true },
  { to: '/profile', icon: User,       label: 'Profile' },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-surface border-t border-border"
      style={{ paddingBottom: 'min(env(safe-area-inset-bottom), 12px)' }}
    >
      <div className="w-full max-w-app flex items-end">
        {tabs.map(({ to, icon: Icon, label, primary }) => (
          <NavLink
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1"
          >
            {({ isActive }) =>
              primary ? (
                <div
                  className={cn(
                    'flex items-center justify-center rounded-xl transition-colors',
                    isActive ? 'bg-primary-700' : 'bg-primary',
                  )}
                  style={{ width: 44, height: 36 }}
                >
                  <Icon size={20} className="text-white" strokeWidth={2.2} />
                </div>
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
