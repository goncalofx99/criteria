import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { confirmPasswordReset } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordStrength, getPasswordChecks } from '@/components/auth/PasswordStrength'

export default function ResetPasswordPage() {
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
      setError(cause instanceof Error ? cause.message : 'This reset link is invalid or expired. Request a new one.')
      setSaving(false)
    }
  }

  return (
    <div className="app-shell auth-page flex min-h-dvh flex-col px-5 pb-safe pt-safe">
      <div className="web-content flex items-center justify-between gap-3 py-5"><Link to="/sign-in" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><ArrowLeft size={18} />Back to sign in</Link><span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-accent"><img src="/icon-192.png" alt="CRITERIA" className="h-full w-full scale-[1.8] object-cover" /></span></div>
      <main className="auth-panel web-content my-auto p-6 md:p-9">
        <p className="editorial-kicker">Account access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose a new password</h1>
        {!token ? (
          <div className="mt-5 space-y-5 text-sm text-muted-foreground"><p>This reset link is missing its code.</p><Link to="/forgot-password" className="font-semibold text-primary underline underline-offset-4">Request a new link</Link></div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input id="new-password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="pr-12" required />
                <button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-1 flex w-11 items-center justify-center text-muted-foreground">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              <PasswordStrength password={password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} error={confirm.length > 0 && confirm !== password} required />
              {confirm.length > 0 && confirm !== password && <p className="text-sm text-destructive">Passwords do not match.</p>}
            </div>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error} <Link to="/forgot-password" className="font-semibold underline">Request a new link</Link></p>}
            <Button type="submit" size="lg" className="w-full" disabled={!valid || saving}>{saving ? <><Loader2 size={18} className="animate-spin" />Saving…</> : 'Save new password'}</Button>
          </form>
        )}
      </main>
    </div>
  )
}
