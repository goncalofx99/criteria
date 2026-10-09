import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { confirmAccountDeletion } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export default function ConfirmDeletePage() {
  const location = useLocation()
  return <ConfirmDeleteFlow key={location.search} search={location.search} />
}

function ConfirmDeleteFlow({ search }: { search: string }) {
  const token = new URLSearchParams(search).get('token')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      await confirmAccountDeletion(token)
      const url = new URL(window.location.href)
      url.searchParams.delete('token')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
      setDone(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete your account. The link may have expired.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="app-shell auth-page flex min-h-dvh flex-col px-5 pb-safe pt-safe">
    <div className="web-content flex items-center justify-between gap-3 py-5"><Link to="/sign-in" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><ArrowLeft size={18} aria-hidden="true" />Back to sign in</Link><span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-accent"><img src="/icon-192.png" alt="CRITERIA" className="h-full w-full scale-[1.8] object-cover" /></span></div>
    <main className="auth-panel web-content my-auto p-6 md:p-9">
      <Trash2 className="mb-5 h-9 w-9 text-destructive" aria-hidden="true" />
      <p className="editorial-kicker">Account security</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Permanently delete your account</h1>
      {!token ? <div className="mt-5 space-y-4"><p role="alert" className="text-sm text-destructive">This deletion link is missing its confirmation code.</p><Link to="/settings" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">Open Settings</Link></div>
        : done ? <div className="mt-5 space-y-5"><p role="status" className="rounded-xl bg-success-muted p-4 text-sm text-success">Your CRITERIA account has been deleted.</p><Button asChild className="min-h-11"><Link to="/">Go to home</Link></Button></div>
        : <form onSubmit={event => { void confirm(event) }} className="mt-5 space-y-5">
          <p className="text-sm leading-relaxed text-muted-foreground">This removes your profile, posts and conversations. This action cannot be undone. If you did not request it, leave this page; your account remains active.</p>
          {error && <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="destructive" disabled={busy} className="min-h-11">{busy && <Loader2 className="animate-spin" aria-hidden="true" />}{busy ? 'Deleting…' : 'Permanently delete account'}</Button>
        </form>}
    </main>
  </div>
}
