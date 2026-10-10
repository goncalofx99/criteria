import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/language'

export default function CheckEmail() {
  const { t } = useLanguage()
  return (
    <div className="app-shell auth-page flex min-h-dvh flex-col items-center justify-center px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))] text-center">
      <div className="mb-8 inline-flex items-center gap-2 text-xs font-semibold tracking-[.16em] text-foreground"><span className="flex h-9 w-9 overflow-hidden rounded bg-accent"><img src="/icon-192.png" alt="" className="h-full w-full scale-[1.8] object-cover" /></span>CRITERIA</div>
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-primary-100">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">{t('Confirme o seu email', 'Check your email')}</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
        {t('Enviámos uma ligação de confirmação para o seu email. Abra-a para ativar a conta.', 'We sent a confirmation link to your email address. Click it to activate your account.')}
      </p>
      <Button asChild variant="outline" className="mt-8 w-full max-w-xs">
        <Link to="/sign-in">{t('Voltar ao início de sessão', 'Back to login')}</Link>
      </Button>
    </div>
  )
}
