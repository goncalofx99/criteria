import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { requestPasswordReset } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { localizedError, useLanguage } from '@/lib/language'

export default function ForgotPasswordPage() {
  const { language, t } = useLanguage()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSending(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (cause) {
      setError(localizedError(cause, language, 'A recuperação da palavra-passe está indisponível. Tente novamente mais tarde.', 'Password reset is unavailable right now. Please try again later.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthLayout backTo="/sign-in" backLabel={t('Voltar ao início de sessão', 'Back to sign in')}>
      <div className="w-full max-w-md self-center">
        <h1 className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">{t('Recuperar palavra-passe', 'Reset your password')}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t('Introduza o email da sua conta e enviaremos uma ligação para definir uma nova palavra-passe.', 'Enter your account email and we’ll send a link to choose a new password.')}</p>
        {sent ? (
          <div role="status" className="mt-7 space-y-5">
            <p className="rounded bg-success-muted px-4 py-4 text-sm leading-relaxed text-success">{t('Se existir uma conta com este endereço, a ligação de recuperação está a caminho. Consulte a caixa de entrada e o spam.', 'If an account uses that address, a reset link is on its way. Check your inbox and spam folder.')}</p>
            <Link to="/sign-in" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4">{t('Voltar ao início de sessão', 'Return to sign in')}</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t('Endereço de email', 'Email address')}</Label>
              <Input id="reset-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required placeholder={t('nome@exemplo.pt', 'you@example.com')} />
            </div>
            {error && <p role="alert" className="rounded bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={sending || !email.trim()}>{sending ? <><Loader2 size={18} aria-hidden="true" className="animate-spin" />{t('A enviar…', 'Sending…')}</> : t('Enviar ligação de recuperação', 'Send reset link')}</Button>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
