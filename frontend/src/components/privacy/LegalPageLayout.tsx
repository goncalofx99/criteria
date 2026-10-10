import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/lib/language'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

interface LegalPageLayoutProps {
  title: string
  introduction: string
  current: 'privacy' | 'terms'
  children: ReactNode
}

export function LegalPageLayout({ title, introduction, current, children }: LegalPageLayoutProps) {
  const { t } = useLanguage()
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-5 pb-2 pt-[calc(.5rem+env(safe-area-inset-top))] md:px-8 md:pt-2">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft size={17} aria-hidden="true" /> {t('Voltar à CRITERIA', 'Back to CRITERIA')}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" className="border-border text-foreground" />
            <Link to="/" aria-label={t('Início da CRITERIA', 'CRITERIA home')} className="text-xs font-semibold tracking-[.16em] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">CRITERIA</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-5 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-7 md:px-8 md:pb-24 md:pt-12">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-16">
          <main id="main-content" className="min-w-0 max-w-[760px]">
            <h1 className="screen-heading">{title}</h1>
            <p className="screen-intro mt-3 max-w-[66ch]">{introduction}</p>
            <p className="mt-3 text-xs text-muted-foreground">{t('Última atualização: 9 de outubro de 2026.', 'Last updated 9 October 2026.')}</p>
            <div className="mt-9 space-y-10 text-[15px] leading-7 text-muted-foreground md:space-y-12">{children}</div>
          </main>

          <aside className="border-t border-border pt-5 lg:sticky lg:top-8 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" aria-label={t('Informação e contacto', 'Information and contact')}>
            <p className="text-sm font-semibold text-foreground">{t('Informação legal', 'Legal information')}</p>
            <nav aria-label={t('Páginas legais', 'Legal pages')} className="mt-3 flex flex-col gap-1 text-sm font-medium">
              <Link to="/privacy" aria-current={current === 'privacy' ? 'page' : undefined} className={`min-h-11 rounded px-3 py-2.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${current === 'privacy' ? 'bg-accent text-foreground' : 'text-primary'}`}>{t('Política de Privacidade', 'Privacy Policy')}</Link>
              <Link to="/terms" aria-current={current === 'terms' ? 'page' : undefined} className={`min-h-11 rounded px-3 py-2.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${current === 'terms' ? 'bg-accent text-foreground' : 'text-primary'}`}>{t('Termos e Condições', 'Terms of Use')}</Link>
            </nav>
            <div className="mt-5 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">{t('Dúvidas ou preocupações?', 'Questions or concerns?')}</p>
              <a href="mailto:criteriaappportugal@gmail.com" className="mt-2 block break-words font-medium text-primary underline underline-offset-2">criteriaappportugal@gmail.com</a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-6 border-t border-border pt-7">
    <h2 id={`${id}-heading`} className="mb-3 text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h2>
    <div className="space-y-4">{children}</div>
  </section>
}
