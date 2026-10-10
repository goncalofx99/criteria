import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signIn } from '@/lib/auth'
import { warmUpBackend } from '@/lib/warmup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { rememberAuthDestination, safeInternalPath } from '@/lib/returnTo'
import { localizedError, useLanguage } from '@/lib/language'

export default function SignInPage() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const resetSuccess = new URLSearchParams(location.search).get('reset') === 'success'
  const passwordChanged = new URLSearchParams(location.search).get('passwordChanged') === '1'
  const oauthFailed = new URLSearchParams(location.search).get('error') === 'oauth_failed'
  const googleEmailAccountExists = new URLSearchParams(location.search).get('error') === 'email_account_exists'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { warmUpBackend() }, [])
  useEffect(() => {
    const next = new URLSearchParams(location.search).get('next')
    if (next) rememberAuthDestination(safeInternalPath(next))
  }, [location.search])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/auth/callback', { replace: true })
    } catch (err) {
      setError(localizedError(err, language, 'Não foi possível iniciar sessão. Verifique o email e a palavra-passe.', 'Sign in failed'))
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      backTo="/"
      backLabel={t('Voltar ao início', 'Back to home')}
      footer={<p className="text-center text-sm text-muted-foreground">{t('Ainda não tem conta na CRITERIA?', 'New to CRITERIA?')}{' '}<Link to={`/sign-up${location.search}`} className="font-semibold text-primary underline underline-offset-4">{t('Criar conta', 'Create an account')}</Link></p>}
    >
      <div className="w-full max-w-md self-center">
        <div className="mb-8">
          <h1 className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">{t('Bem-vindo de volta', 'Welcome back')}</h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t('Inicie sessão para gerir pesquisas, anúncios e conversas.', 'Sign in to manage your searches, posts and conversations.')}</p>
        </div>

        <div className="mb-6"><SocialAuthButtons variant="compact" onError={setError} /></div>

        <div className="relative mb-6 flex items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">{t('ou use o email', 'or use email')}</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSignIn} className="space-y-5">
          {resetSuccess && <p role="status" className="rounded bg-success-muted p-3 text-sm text-success">{t('Palavra-passe atualizada. Inicie sessão com a nova palavra-passe.', 'Password updated. Sign in with your new password.')}</p>}
          {passwordChanged && <p role="status" className="rounded bg-success-muted p-3 text-sm text-success">{t('Palavra-passe alterada. Inicie sessão novamente neste dispositivo.', 'Password changed. Sign in again on this device.')}</p>}
          {oauthFailed && <p role="alert" className="rounded bg-destructive/10 p-3 text-sm text-destructive">{t('Não foi possível concluir o início de sessão com o Google. Tente novamente.', 'Google sign-in could not be completed. Please try again.')}</p>}
          {googleEmailAccountExists && <p role="alert" className="rounded bg-destructive/10 p-3 text-sm text-destructive">{t('Já existe uma conta com este email. Inicie sessão com a sua palavra-passe ou recupere-a.', 'An account already uses this email. Sign in with its password or reset it.')}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('nome@exemplo.pt', 'you@example.com')}
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('Palavra-passe', 'Password')}</Label>
              <Link to="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4">
                {t('Recuperar palavra-passe', 'Forgot password?')}
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('A sua palavra-passe', 'Your password')}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? t('Ocultar palavra-passe', 'Hide password') : t('Mostrar palavra-passe', 'Show password')}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-1 flex w-11 items-center justify-center text-muted-foreground"
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye className="h-4 w-4" />
                }
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive animate-fade-in">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={loading || !email || !password}
            className="mt-2 w-full"
          >
            {loading ? <><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{t('A iniciar sessão…', 'Signing in…')}</> : t('Iniciar sessão', 'Sign in')}
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}
