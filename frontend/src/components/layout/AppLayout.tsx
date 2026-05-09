import { Outlet, useLocation } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { signOut } from '@/lib/auth'
import { BottomNav } from './BottomNav'

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
      className="sticky top-0 z-40 bg-surface border-b border-border/70"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <h1 className="text-lg font-bold text-foreground">Profile</h1>
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
    <div className="app-shell flex flex-col bg-background">
      <AppHeader />
      <main
        className="flex-1"
        style={{ paddingBottom: 'calc(56px + min(env(safe-area-inset-bottom), 12px))' }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
