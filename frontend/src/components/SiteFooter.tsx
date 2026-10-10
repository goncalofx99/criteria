import { Link } from 'react-router-dom'
import { useLanguage } from '@/lib/language'

/** Public-site footer. Every destination is live; no invented address or social account. */
export function SiteFooter() {
  const { t } = useLanguage()
  return (
    <footer className="border-t border-border bg-surface text-foreground">
      <div className="mx-auto grid w-full max-w-[1400px] gap-9 px-6 py-10 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-12 md:px-10 md:py-12">
        <div className="max-w-sm">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold tracking-[.16em] text-foreground" aria-label={t('Início da CRITERIA', 'CRITERIA home')}>
            <img src="/icon-192.png" alt="" width="36" height="36" className="h-9 w-9 rounded-sm object-cover" />
            CRITERIA
          </Link>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('Um lugar para juntar imóveis e critérios de compradores.', 'A place for property listings and buyer criteria to meet.')}</p>
          <p className="mt-3 text-xs text-muted-foreground">{t('Operado por Gonçalo Félix.', 'Operated by Gonçalo Félix.')}</p>
        </div>
        <nav aria-label={t('Explorar a CRITERIA', 'Explore CRITERIA')} className="flex flex-col items-start gap-1 text-sm">
          <span className="pb-1 font-semibold">{t('Explorar', 'Explore')}</span>
          <Link to="/feed" state={{ resetScroll: true }} className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground hover:underline">{t('Ver imóveis', 'Browse properties')}</Link>
          <Link to="/requests" state={{ resetScroll: true }} className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground hover:underline">{t('Ver critérios', 'Browse criteria')}</Link>
          <Link to="/#faq" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground hover:underline">{t('Perguntas frequentes', 'Frequently asked questions')}</Link>
          <Link to="/sign-up" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground hover:underline">{t('Criar conta', 'Create an account')}</Link>
          <Link to="/sign-in" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground hover:underline">{t('Iniciar sessão', 'Sign in')}</Link>
        </nav>
        <nav aria-label={t('Informações e contacto', 'Information and contact')} className="flex flex-col items-start gap-1 text-sm">
          <span className="pb-1 font-semibold">{t('Informações', 'Information')}</span>
          <Link to="/privacy" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground hover:underline">{t('Política de privacidade', 'Privacy policy')}</Link>
          <Link to="/terms" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground hover:underline">{t('Termos e condições', 'Terms and conditions')}</Link>
          <a href="mailto:criteriaappportugal@gmail.com" className="inline-flex min-h-11 items-center break-all text-muted-foreground hover:text-foreground hover:underline">criteriaappportugal@gmail.com</a>
        </nav>
      </div>
    </footer>
  )
}
