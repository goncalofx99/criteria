import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/sign-in?next=${encodeURIComponent(next)}`} replace />
  }

  return <Outlet />
}
