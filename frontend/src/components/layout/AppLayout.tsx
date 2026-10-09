import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { signOut } from '@/lib/auth'
import { useMe } from '@/hooks/useMe'
import { cn } from '@/lib/utils'
import { BottomNav } from './BottomNav'
import { tabs } from './navigation'

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
        <NavLink to="/feed" className="flex shrink-0 items-center gap-2.5" aria-label="CRITERIA, Explore">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/10 font-semibold">C</span>
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
      <main className="workspace-main min-w-0 flex-1 pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
