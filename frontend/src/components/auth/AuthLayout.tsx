import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StepIndicator } from '@/components/auth/StepIndicator'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useLanguage } from '@/lib/language'

interface AuthLayoutProps {
  children: ReactNode
  footer?: ReactNode
  backTo?: string
  onBack?: () => void
  backLabel?: string
  step?: { current: number; total: number }
}

/** A single, keyboard-safe frame for account tasks on web and in Capacitor. */
export function AuthLayout({ children, footer, backTo, onBack, backLabel, step }: AuthLayoutProps) {
  const { t } = useLanguage()
  const accessibleBackLabel = backLabel ?? t('Voltar', 'Back')
  const back = onBack ? (
    <Button type="button" variant="outline" size="icon" onClick={onBack} aria-label={accessibleBackLabel} className="border-border bg-surface">
      <ChevronLeft aria-hidden="true" className="h-5 w-5" />
    </Button>
  ) : backTo ? (
    <Button asChild variant="outline" size="icon" className="border-border bg-surface">
      <Link to={backTo} aria-label={accessibleBackLabel}><ChevronLeft aria-hidden="true" className="h-5 w-5" /></Link>
    </Button>
  ) : <span className="h-11 w-11" aria-hidden="true" />

  return (
    <div className="app-shell min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(320px,42%)_minmax(0,1fr)]">
      <aside className="relative hidden min-h-dvh overflow-hidden bg-primary-900 text-white lg:flex lg:flex-col lg:justify-between">
        <img src="/landing-home.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/75 via-primary-900/25 to-primary-900/90" />
        <Link to="/" className="relative m-10 inline-flex w-fit items-center gap-3 text-sm font-semibold tracking-[.14em] text-white xl:m-14">
          <span className="flex h-10 w-10 overflow-hidden rounded bg-accent"><img src="/icon-192.png" alt="" className="h-full w-full scale-[1.8] object-cover" /></span>
          CRITERIA
        </Link>
        <div className="relative max-w-xl p-10 xl:p-14">
          <p className="max-w-[16ch] text-[clamp(2rem,3vw,3.25rem)] font-semibold leading-[1.08] tracking-[-.03em] text-white">{t('Encontre o lugar certo para si.', 'Find a place that fits.')}</p>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/90">{t('Pesquise imóveis em Portugal ou partilhe o que procura.', 'Search properties across Portugal or share what you are looking for.')}</p>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col lg:mx-auto lg:w-full lg:max-w-[680px]">
        <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 px-5 pb-2 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-8 md:grid-cols-[44px_minmax(0,1fr)_auto] lg:px-10 lg:pt-8">
          {back}
          {step ? <StepIndicator current={step.current} total={step.total} /> : <span />}
          <Link to="/" aria-label={t('Início da CRITERIA', 'CRITERIA home')} className="flex h-11 w-11 items-center justify-center rounded bg-accent md:hidden">
            <img src="/icon-192.png" alt="" className="h-9 w-9 scale-[1.35] object-cover" />
          </Link>
          <LanguageSwitcher variant="light" className="border-border text-foreground" />
        </header>

        <main className="flex w-full flex-1 flex-col px-6 pb-5 pt-8 sm:px-9 lg:justify-center lg:px-12 lg:pb-8 lg:pt-4">
          {children}
        </main>
        {footer && <div className="w-full px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3 sm:px-9 lg:px-12 lg:pb-10">{footer}</div>}
      </div>
    </div>
  )
}
