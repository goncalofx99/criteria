import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { signOut } from '@/lib/auth'
import { useMe } from '@/hooks/useMe'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import { BottomNav } from './BottomNav'
import { tabs } from './navigation'

function MobileNavigationHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 pt-safe backdrop-blur-xl md:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <NavLink to="/feed" className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg" aria-label="CRITERIA, Explore">
          <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-accent">
            <img src="/icon-192.png" alt="" className="h-full w-full scale-[1.8] object-cover" />
          </span>
          <span className="truncate text-sm font-bold tracking-[.16em] text-primary-900">CRITERIA</span>
        </NavLink>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle compact className="[&>svg]:text-foreground" />
          <NavLink
            to="/profile"
            aria-label="Profile"
            className={({ isActive }) => cn(
              'flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors',
              isActive ? 'bg-primary-100 text-primary-900' : 'text-foreground hover:bg-overlay',
            )}
          >
            <UserRound className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="max-[359px]:sr-only">Profile</span>
          </NavLink>
        </div>
      </div>
    </header>
  )
}

function DesktopNavigation() {
  const { me } = useMe()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="desktop-top-nav sticky top-0 z-50 hidden border-b border-white/10 bg-primary-900 text-white md:block" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="workspace-content flex min-h-[72px] items-center gap-6 px-6 lg:px-10">
        <NavLink to="/feed" className="flex min-h-11 shrink-0 items-center gap-2.5" aria-label="CRITERIA, Explore">
          <span className="flex h-9 w-9 overflow-hidden rounded-xl bg-accent">
            <img src="/icon-192.png" alt="" className="h-full w-full scale-[1.8] object-cover" />
          </span>
          <span className="text-base font-semibold tracking-[.14em]">CRITERIA</span>
        </NavLink>
        <nav className="ml-3 flex min-w-0 flex-1 items-center gap-1" aria-label="Primary navigation">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors lg:px-4',
                isActive ? 'bg-white text-primary-900' : 'text-primary-200 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex min-w-0 items-center gap-2 border-l border-white/15 pl-4">
          <ThemeToggle compact className="border-white/20 bg-white/10 text-white hover:bg-white/15 [&>svg]:text-white" />
          <span className="hidden max-w-[160px] truncate text-sm text-primary-200 lg:block">{me?.fullName ?? 'Your account'}</span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-11 w-11 items-center justify-center rounded-full text-primary-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}

export function AppLayout() {
  return (
    <div className="app-shell flex min-h-dvh flex-col bg-background">
      <DesktopNavigation />
      <MobileNavigationHeader />
      <main className="workspace-main min-w-0 flex-1 pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
