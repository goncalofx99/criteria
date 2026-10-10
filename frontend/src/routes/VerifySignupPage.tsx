import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { confirmSignUp } from '@/lib/auth'
import { localizedError, useLanguage } from '@/lib/language'
import { takeAuthDestination } from '@/lib/returnTo'

export default function VerifySignupPage() {
  const { language, t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const token = new URLSearchParams(location.search).get('token')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const url = new URL(window.location.href)
    url.searchParams.delete('token')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }, [token])

  async function activate(event: FormEvent) {
    event.preventDefault()
    if (!token || busy) return
    setBusy(true)
    setError(null)
    try {
      await confirmSignUp(token)
      navigate(takeAuthDestination('/'), { replace: true })
    } catch (cause) {
      setError(localizedError(cause, language,
        'Esta ligação é inválida ou expirou. Tente criar a conta novamente.',
        'This link is invalid or expired. Try creating your account again.'))
      setBusy(false)
    }
  }

  return <AuthLayout backTo="/sign-in" backLabel={t('Voltar ao início de sessão', 'Back to sign in')}>
    <div className="w-full max-w-md self-center">
      <h1 className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">
        {t('Ative a sua conta', 'Activate your account')}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t('Confirme que este endereço de email é seu para concluir a criação da conta.', 'Confirm that this email address is yours to finish creating your account.')}
      </p>
      {!token ? <p role="alert" className="mt-6 text-sm text-destructive">
        {t('Falta o código de confirmação. Abra a ligação que enviámos por email.', 'The verification code is missing. Open the link we emailed you.')}
      </p> : <form onSubmit={event => { void activate(event) }} className="mt-8 space-y-4">
        {error && <p role="alert" className="rounded bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {busy ? t('A ativar…', 'Activating…') : t('Ativar conta', 'Activate account')}
        </Button>
      </form>}
      <Link to="/sign-up" className="mt-6 inline-block text-sm font-semibold text-primary underline underline-offset-4">
        {t('Criar uma nova conta', 'Create a new account')}
      </Link>
    </div>
  </AuthLayout>
}
