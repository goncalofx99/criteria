import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { confirmPasswordReset } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordStrength, getPasswordChecks } from '@/components/auth/PasswordStrength'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { localizedError, useLanguage } from '@/lib/language'

export default function ResetPasswordPage() {
  const { language, t } = useLanguage()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = getPasswordChecks(password).every(check => check.passed) && password === confirm

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!token || !valid) return
    setSaving(true)
    setError(null)
    try {
      await confirmPasswordReset(token, password)
      navigate('/sign-in?reset=success', { replace: true })
    } catch (cause) {
      setError(localizedError(cause, language, 'Esta ligação é inválida ou expirou. Peça uma nova.', 'This reset link is invalid or expired. Request a new one.'))
      setSaving(false)
    }
  }

  return (
    <AuthLayout backTo="/sign-in" backLabel={t('Voltar ao início de sessão', 'Back to sign in')}>
      <div className="w-full max-w-md self-center">
        <h1 className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">{t('Defina uma nova palavra-passe', 'Choose a new password')}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t('Escolha uma palavra-passe forte e diferente das que usa noutros serviços.', 'Make it strong and different from passwords you use elsewhere.')}</p>
        {!token ? (
          <div className="mt-7 space-y-5"><p role="alert" className="rounded bg-destructive/10 px-4 py-3 text-sm text-destructive">{t('Falta o código nesta ligação de recuperação.', 'This reset link is missing its code.')}</p><Link to="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4">{t('Pedir uma nova ligação', 'Request a new link')}</Link></div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('Nova palavra-passe', 'New password')}</Label>
              <div className="relative">
                <Input id="new-password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="pr-12" required />
                <button type="button" aria-label={visible ? t('Ocultar palavra-passe', 'Hide password') : t('Mostrar palavra-passe', 'Show password')} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-1 flex w-11 items-center justify-center text-muted-foreground">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              <PasswordStrength password={password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('Confirmar nova palavra-passe', 'Confirm new password')}</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} error={confirm.length > 0 && confirm !== password} aria-describedby={confirm.length > 0 && confirm !== password ? 'reset-match-error' : undefined} required />
              {confirm.length > 0 && confirm !== password && <p id="reset-match-error" role="alert" className="text-sm text-destructive">{t('As palavras-passe não coincidem.', 'Passwords do not match.')}</p>}
            </div>
            {error && <p role="alert" className="rounded bg-destructive/10 p-3 text-sm text-destructive">{error} <Link to="/forgot-password" className="font-semibold underline">{t('Pedir uma nova ligação', 'Request a new link')}</Link></p>}
            <Button type="submit" size="lg" className="w-full" disabled={!valid || saving}>{saving ? <><Loader2 size={18} aria-hidden="true" className="animate-spin" />{t('A guardar…', 'Saving…')}</> : t('Guardar nova palavra-passe', 'Save new password')}</Button>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
