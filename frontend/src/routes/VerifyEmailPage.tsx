import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { confirmAccountEmailChangeCurrent, confirmAccountEmailChangeNew } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  const location = useLocation()
  // Both approval links use this path. A new token must start a fresh form,
  // even when React Router reuses the same route instance for the next step.
  return <VerifyEmailFlow key={location.search} search={location.search} />
}

function VerifyEmailFlow({ search }: { search: string }) {
  const params = new URLSearchParams(search)
  const token = params.get('token')
  const step = params.get('step')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)
  const valid = !!token && (step === 'current' || step === 'new')
  const heading = step === 'current' ? 'Approve your email change' : step === 'new' ? 'Verify your new address' : 'Email verification'

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
      setError(cause instanceof Error ? cause.message : 'This link could not be verified. Request a new email change from Settings.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="app-shell auth-page flex min-h-dvh flex-col px-5 pb-safe pt-safe">
    <div className="web-content flex items-center justify-between gap-3 py-5"><Link to="/sign-in" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><ArrowLeft size={18} aria-hidden="true" />Back to sign in</Link><span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-accent"><img src="/icon-192.png" alt="CRITERIA" className="h-full w-full scale-[1.8] object-cover" /></span></div>
    <main className="auth-panel web-content my-auto p-6 md:p-9">
      <MailCheck className="mb-5 h-9 w-9 text-primary" aria-hidden="true" />
      <p className="editorial-kicker">Account security</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{heading}</h1>
      {!valid ? <div className="mt-5 space-y-4"><p role="alert" className="text-sm text-destructive">This email link is invalid or incomplete.</p><Link to="/settings" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">Open Settings</Link></div>
        : done ? <div className="mt-5 space-y-4">
          <p role="status" className="rounded-xl bg-success-muted p-4 text-sm text-success">{step === 'current' ? 'Approved. We sent a verification link to your new email address. Open that link to finish the change.' : 'Your email address has been updated. Sign in again to continue.'}</p>
          {reviewUrl && <Link to={reviewUrl} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2">Open review verification link</Link>}
          {step === 'new' && <Button asChild className="min-h-11"><Link to="/sign-in">Sign in</Link></Button>}
        </div>
        : <form onSubmit={event => { void confirm(event) }} className="mt-5 space-y-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{step === 'current' ? 'Confirm that you requested an email change. We’ll then send a second verification link to your new address. Your account email will not change yet.' : 'This is the final step. Confirm the new address to update your account. For security, you’ll be signed out on every device.'}</p>
          {error && <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} className="min-h-11">{busy && <Loader2 className="animate-spin" aria-hidden="true" />}{busy ? 'Verifying…' : step === 'current' ? 'Approve change' : 'Verify new email'}</Button>
        </form>}
    </main>
  </div>
}
