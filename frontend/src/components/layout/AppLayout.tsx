import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, LogOut } from 'lucide-react'
import { useState } from 'react'
import { signOut } from '@/lib/auth'
import { useMe } from '@/hooks/useMe'
import { BottomNav } from './BottomNav'
import { tabs } from './navigation'

function DesktopRail() {
  const { me } = useMe()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <aside className="desktop-rail app-rail sticky top-0 hidden h-dvh w-[244px] shrink-0 flex-col px-5 py-7 xl:w-[264px]" aria-label="Workspace navigation">
      <NavLink to="/feed" className="flex items-center gap-3 px-2 text-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/25 bg-white/10 font-semibold text-xl tracking-tight">C</span>
        <span className="text-lg font-semibold tracking-[.14em]">CRITERIA</span>
      </NavLink>

      <div className="mt-12 px-3">
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-primary-400">Your workspace</p>
        <p className="mt-2 text-sm leading-relaxed text-primary-200">A place for homes and the people looking for them.</p>
      </div>

      <nav className="mt-9 space-y-2" aria-label="Primary navigation">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className="app-rail-link">
            <Icon size={19} strokeWidth={1.9} />
            <span>{label}</span>
            {to === '/create' && <ArrowUpRight size={15} className="ml-auto opacity-60" />}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-[20px] border border-white/10 bg-white/5 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-primary-400">Signed in as</p>
        <p className="mt-2 truncate text-sm font-semibold text-white">{me?.fullName ?? 'Your account'}</p>
        <p className="mt-1 text-xs text-primary-200">{me?.role === 'both' ? 'Buyer & seller' : me?.role ?? 'Member'}</p>
        <button type="button" onClick={handleSignOut} disabled={signingOut} className="mt-5 flex items-center gap-2 text-xs font-medium text-primary-200 hover:text-white disabled:opacity-50">
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  )
}

function AppHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const isProfile = pathname === '/profile'

  // Only show the shared header on the profile page (Feed has its own complex header)
  if (!isProfile) return null

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div
      className="profile-mobile-header sticky top-0 z-40 border-b border-border/70 bg-surface/90 backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <h1 className="text-lg font-semibold text-foreground">Profile</h1>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}

export function AppLayout() {
  return (
    <div className="app-shell flex bg-background">
      <DesktopRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main
          className="workspace-main min-w-0 flex-1"
          style={{ paddingBottom: 'calc(64px + min(env(safe-area-inset-bottom), 12px))' }}
        >
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
