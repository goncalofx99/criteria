import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { requestPasswordReset } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
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
      setError(cause instanceof Error ? cause.message : 'Password reset is unavailable right now. Please try again later.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="app-shell auth-page flex min-h-dvh flex-col px-5 pb-safe pt-safe">
      <div className="web-content flex items-center justify-between gap-3 py-5">
        <Link to="/sign-in" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><ArrowLeft size={18} />Back to sign in</Link>
        <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-accent"><img src="/icon-192.png" alt="CRITERIA" className="h-full w-full scale-[1.8] object-cover" /></span>
      </div>
      <main className="auth-panel web-content my-auto p-6 md:p-9">
        <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary"><Mail size={23} aria-hidden="true" /></span>
        <p className="editorial-kicker">Account access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reset your password</h1>
        {sent ? (
          <div role="status" className="mt-5 space-y-5 text-sm leading-relaxed text-muted-foreground">
            <p>If an account uses that address, we’ll send a reset link. Check your inbox and spam folder.</p>
            <Link to="/sign-in" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">Return to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">Enter the email on your account. We’ll send a one-time link if it matches.</p>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email address</Label>
              <Input id="reset-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required placeholder="you@example.com" />
            </div>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={sending || !email.trim()}>{sending ? <><Loader2 size={18} className="animate-spin" />Sending…</> : 'Send reset link'}</Button>
          </form>
        )}
      </main>
    </div>
  )
}
