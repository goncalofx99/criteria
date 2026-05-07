import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="app-shell flex flex-col bg-background">
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
