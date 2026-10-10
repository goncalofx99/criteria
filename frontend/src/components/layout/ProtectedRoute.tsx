import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/lib/language'

export default function ProtectedRoute() {
  const { t } = useLanguage()
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div role="status" aria-label={t('A carregar a sua conta', 'Loading your account')} className="flex min-h-dvh items-center justify-center bg-background px-6">
        <span className="sr-only">{t('A carregar a sua conta…', 'Loading your account…')}</span>
        <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/sign-in?next=${encodeURIComponent(next)}`} replace />
  }

  return <Outlet />
}
