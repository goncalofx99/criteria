import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apolloClient } from '@/lib/apollo'
import { Loader2 } from 'lucide-react'
import { handleOAuthCallback, getAccessToken } from '@/lib/auth'
import { GET_ME } from '@/lib/gql'
import { takeAuthDestination } from '@/lib/returnTo'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { localizedError, useLanguage } from '@/lib/language'

export default function AuthCallback() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const called = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (called.current) return
    called.current = true

    async function handle() {
      // Exchange the one-time browser code; native has already exchanged it.
      try {
        await handleOAuthCallback()
      } catch {
        setError(t('A ligação de início de sessão expirou ou não pôde ser utilizada. Tente novamente.', 'The sign-in link expired or could not be used. Please try again.'))
        return
      }

      // Check if we have a valid session
      const token = getAccessToken()
      if (!token) {
        setError(t('O início de sessão não foi concluído. Tente novamente.', 'Sign-in did not complete. Please try again.'))
        return
      }

      try {
        // Check if user already exists in our DB (returning user vs brand new)
        const { data: meData } = await apolloClient.query({
          query: GET_ME,
          fetchPolicy: 'network-only',
        })
        if (meData?.me?.onboardingComplete) {
          navigate(takeAuthDestination('/'), { replace: true })
        } else {
          navigate('/onboarding', { replace: true })
        }
      } catch (err) {
        setError(localizedError(err, language, 'Não foi possível carregar o seu perfil. Tente novamente.', 'Could not load your profile. Please retry.'))
      }
    }

    handle()
  }, [language, navigate, t])

  return (
    <AuthLayout>
      <div className="flex w-full max-w-md flex-col items-center gap-4 self-center text-center">
        {error ? <>
          <h1 className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">{t('Tente iniciar sessão novamente', 'Sign-in needs another try')}</h1>
          <p role="alert" className="text-sm leading-relaxed text-destructive">{error}</p>
          <Link to="/sign-in" className="mt-3 inline-flex min-h-12 items-center justify-center rounded bg-primary px-5 text-sm font-semibold text-primary-foreground">{t('Voltar ao início de sessão', 'Back to sign in')}</Link>
        </> : <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-foreground">{t('A iniciar sessão', 'Signing you in')}</h1>
          <p role="status" className="text-sm text-muted-foreground">{t('A verificar a sua conta e a regressar à CRITERIA…', 'Checking your account and returning you to CRITERIA…')}</p>
        </>}
      </div>
    </AuthLayout>
  )
}
