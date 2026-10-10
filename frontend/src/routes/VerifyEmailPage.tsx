import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { confirmAccountEmailChangeCurrent, confirmAccountEmailChangeNew } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { localizedError, useLanguage } from '@/lib/language'

export default function VerifyEmailPage() {
  const location = useLocation()
  // Both approval links use this path. A new token must start a fresh form,
  // even when React Router reuses the same route instance for the next step.
  return <VerifyEmailFlow key={location.search} search={location.search} />
}

function VerifyEmailFlow({ search }: { search: string }) {
  const { language, t } = useLanguage()
  const params = new URLSearchParams(search)
  const token = params.get('token')
  const step = params.get('step')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)
  const valid = !!token && (step === 'current' || step === 'new')
  const heading = step === 'current' ? t('Aprovar a alteração de email', 'Approve your email change') : step === 'new' ? t('Confirmar o novo endereço', 'Verify your new address') : t('Confirmação de email', 'Email verification')

  async function confirm(event: FormEvent) {
    event.preventDefault()
    if (!token || !valid) return
    setBusy(true)
    setError(null)
    try {
      if (step === 'current') {
        const result = await confirmAccountEmailChangeCurrent(token)
        setReviewUrl(result.reviewUrl ?? null)
      } else {
        await confirmAccountEmailChangeNew(token)
      }
      const url = new URL(window.location.href)
      url.searchParams.delete('token')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
      setDone(true)
    } catch (cause) {
      setError(localizedError(cause, language, 'Não foi possível confirmar esta ligação. Peça uma nova alteração de email nas Definições.', 'This link could not be verified. Request a new email change from Settings.'))
    } finally {
      setBusy(false)
    }
  }

  return <AuthLayout backTo="/sign-in" backLabel={t('Voltar ao início de sessão', 'Back to sign in')}>
    <div className="w-full max-w-md self-center">
      <h1 className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">{heading}</h1>
      {!valid ? <div className="mt-5 space-y-4"><p role="alert" className="text-sm text-destructive">{t('Esta ligação de email é inválida ou está incompleta.', 'This email link is invalid or incomplete.')}</p><Link to="/settings" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">{t('Abrir definições', 'Open Settings')}</Link></div>
        : done ? <div className="mt-5 space-y-4">
          <p role="status" className="rounded-xl bg-success-muted p-4 text-sm text-success">{step === 'current' ? t('Aprovado. Enviámos uma ligação de confirmação para o seu novo email. Abra-a para concluir a alteração.', 'Approved. We sent a verification link to your new email address. Open that link to finish the change.') : t('O seu endereço de email foi atualizado. Inicie sessão novamente para continuar.', 'Your email address has been updated. Sign in again to continue.')}</p>
          {reviewUrl && <Link to={reviewUrl} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2">{t('Abrir ligação de confirmação para revisão', 'Open review verification link')}</Link>}
          {step === 'new' && <Button asChild className="min-h-11"><Link to="/sign-in">{t('Iniciar sessão', 'Sign in')}</Link></Button>}
        </div>
        : <form onSubmit={event => { void confirm(event) }} className="mt-5 space-y-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{step === 'current' ? t('Confirme que pediu a alteração de email. Depois enviaremos uma segunda ligação de confirmação para o novo endereço. O email da sua conta ainda não será alterado.', 'Confirm that you requested an email change. We’ll then send a second verification link to your new address. Your account email will not change yet.') : t('Este é o último passo. Confirme o novo endereço para atualizar a conta. Por segurança, a sessão será terminada em todos os dispositivos.', 'This is the final step. Confirm the new address to update your account. For security, you’ll be signed out on every device.')}</p>
          {error && <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={busy} className="w-full rounded-xl">{busy && <Loader2 className="animate-spin" aria-hidden="true" />}{busy ? t('A confirmar…', 'Verifying…') : step === 'current' ? t('Aprovar alteração', 'Approve change') : t('Confirmar novo email', 'Verify new email')}</Button>
        </form>}
    </div>
  </AuthLayout>
}
