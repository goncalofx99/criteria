import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMe } from '@/hooks/useMe'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'
import { BottomNav } from './BottomNav'
import { navigationTabs } from './navigation'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

function MobileNavigationHeader() {
  const { me } = useMe()
  const { t } = useLanguage()
  const { pathname } = useLocation()
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 pt-safe backdrop-blur-xl md:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <NavLink to="/" className="flex min-h-11 min-w-0 items-center gap-2.5" aria-label={t('Início da CRITERIA', 'CRITERIA home')}>
          <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-accent">
            <img src="/icon-192.png" alt="" className="h-full w-full scale-[1.8] object-cover" />
          </span>
          <span className="truncate text-sm font-bold tracking-[.16em] text-primary-900">CRITERIA</span>
        </NavLink>
        <NavLink
          to="/profile"
          aria-label={me?.fullName ? t(`Abrir perfil de ${me.fullName}`, `Open ${me.fullName}'s profile`) : t('Abrir perfil', 'Open profile')}
          className={({ isActive }) => cn(
            'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border transition-colors',
            isActive || pathname === '/settings' ? 'border-primary bg-primary-100 text-primary-900' : 'border-transparent text-foreground hover:border-border hover:bg-overlay',
          )}
        >
          {me
            ? <MemberAvatar member={me} className="h-8 w-8" />
            : <UserRound className="h-[19px] w-[19px]" aria-hidden="true" />}
        </NavLink>
      </div>
    </header>
  )
}

function DesktopNavigation() {
  const { me, canViewCriteria } = useMe()
  const { t } = useLanguage()
  const { pathname } = useLocation()

  return (
    <header className="desktop-top-nav sticky top-0 z-50 hidden border-b border-white/10 bg-primary-900 text-white md:block" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="workspace-content flex min-h-[72px] items-center gap-3 px-6 lg:gap-6 lg:px-10">
        <NavLink to="/" className="flex min-h-11 shrink-0 items-center gap-2.5" aria-label={t('Início da CRITERIA', 'CRITERIA home')}>
          <span className="flex h-9 w-9 overflow-hidden rounded-sm bg-accent">
            <img src="/icon-192.png" alt="" className="h-full w-full scale-[1.8] object-cover" />
          </span>
          <span className="text-base font-semibold tracking-[.14em]">CRITERIA</span>
        </NavLink>
        <nav className="flex min-w-0 flex-1 items-center gap-1 lg:ml-3" aria-label={t('Navegação principal', 'Primary navigation')}>
          {navigationTabs(canViewCriteria).map(({ to, icon: Icon, label, labelPt, desktopLabel }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex min-h-11 items-center gap-2 border-b-2 px-2 text-sm font-medium transition-colors lg:px-4',
                isActive ? 'border-accent text-white' : 'border-transparent text-primary-200 hover:border-white/35 hover:text-white',
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {t(labelPt, desktopLabel ?? label)}
            </NavLink>
          ))}
        </nav>
        <LanguageSwitcher className="border-white/30 text-white" />
        <NavLink
          to="/profile"
          aria-label={me?.fullName ? t(`Abrir perfil de ${me.fullName}`, `Open ${me.fullName}'s profile`) : t('Abrir perfil', 'Open profile')}
          className={({ isActive }) => cn(
            'flex min-h-11 min-w-11 shrink-0 items-center gap-2.5 border-l border-white/15 pl-4 text-sm transition-colors',
            isActive || pathname === '/settings' ? 'text-white' : 'text-primary-200 hover:text-white',
          )}
        >
          <span className="hidden max-w-[160px] truncate lg:block">{me?.fullName ?? t('A sua conta', 'Your account')}</span>
          {me
            ? <MemberAvatar member={me} className="h-9 w-9 border border-white/25" />
            : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10"><UserRound className="h-[18px] w-[18px]" aria-hidden="true" /></span>}
        </NavLink>
      </div>
    </header>
  )
}

function GuestNavigationHeader() {
  const { t } = useLanguage()
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface text-foreground md:border-white/10 md:bg-primary-900 md:text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="workspace-content flex min-h-14 items-center justify-between gap-4 px-4 md:min-h-[72px] md:px-8 lg:px-10">
        <Link to="/" aria-label={t('Início da CRITERIA', 'CRITERIA home')} className="inline-flex min-h-11 items-center gap-2.5 text-sm font-semibold tracking-[.14em] md:text-base">
          <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-accent"><img src="/icon-192.png" alt="" className="h-full w-full scale-[1.8] object-cover" /></span>
          CRITERIA
        </Link>
        <nav aria-label={t('Navegação da conta', 'Account navigation')} className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher className="border-white/30 text-white" />
          <Link to="/sign-in" className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-accent md:text-white md:hover:bg-white/10 sm:px-3">{t('Entrar', 'Log in')}</Link>
          <Link to="/sign-up" className="hidden min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-700 sm:inline-flex md:bg-white md:text-primary-900 md:hover:bg-accent">{t('Criar conta', 'Join CRITERIA')}</Link>
        </nav>
      </div>
    </header>
  )
}

export function AppLayout() {
  const { isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  const inInbox = pathname === '/inbox' || pathname.startsWith('/inbox/')
  const [inboxViewportHeight, setInboxViewportHeight] = useState<number | null>(null)

  useEffect(() => {
    if (!inInbox) return
    const viewport = window.visualViewport
    const update = () => {
      setInboxViewportHeight(window.matchMedia('(max-width: 767px)').matches
        ? Math.round(viewport?.height ?? window.innerHeight)
        : null)
    }
    update()
    viewport?.addEventListener('resize', update)
    window.addEventListener('resize', update)
    return () => {
      viewport?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
    }
  }, [inInbox])

  return (
    <div
      className={cn('app-shell flex min-h-dvh flex-col bg-background', inInbox && 'overflow-hidden md:overflow-visible')}
      style={inInbox && inboxViewportHeight ? { height: inboxViewportHeight, minHeight: 0 } : undefined}
    >
      {isAuthenticated ? <><DesktopNavigation /><MobileNavigationHeader /></> : <GuestNavigationHeader />}
      <main className={cn(
        'workspace-main min-w-0 flex-1',
        inInbox ? 'min-h-0 overflow-hidden md:overflow-visible' : isAuthenticated && 'pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0',
      )}>
        <Outlet />
      </main>
      {isAuthenticated && <BottomNav />}
    </div>
  )
}
