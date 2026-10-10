import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { confirmAccountDeletion } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { localizedError, useLanguage } from '@/lib/language'

export default function ConfirmDeletePage() {
  const location = useLocation()
  return <ConfirmDeleteFlow key={location.search} search={location.search} />
}

function ConfirmDeleteFlow({ search }: { search: string }) {
  const { language, t } = useLanguage()
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
      setError(localizedError(cause, language, 'Não foi possível eliminar a conta. A ligação pode ter expirado.', 'Could not delete your account. The link may have expired.'))
    } finally {
      setBusy(false)
    }
  }

  return <AuthLayout backTo="/sign-in" backLabel={t('Voltar ao início de sessão', 'Back to sign in')}>
    <div className="w-full max-w-md self-center">
      <h1 className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">{t('Eliminar a sua conta definitivamente', 'Permanently delete your account')}</h1>
      {!token ? <div className="mt-5 space-y-4"><p role="alert" className="text-sm text-destructive">{t('Falta o código de confirmação nesta ligação.', 'This deletion link is missing its confirmation code.')}</p><Link to="/settings" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">{t('Abrir definições', 'Open Settings')}</Link></div>
        : done ? <div className="mt-5 space-y-5"><p role="status" className="rounded bg-success-muted p-4 text-sm text-success">{t('A sua conta CRITERIA foi eliminada.', 'Your CRITERIA account has been deleted.')}</p><Button asChild className="min-h-11"><Link to="/">{t('Ir para o início', 'Go to home')}</Link></Button></div>
        : <form onSubmit={event => { void confirm(event) }} className="mt-5 space-y-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{t('Isto elimina o seu perfil, anúncios e conversas. Esta ação não pode ser anulada. Se não a pediu, saia desta página; a sua conta permanece ativa.', 'This removes your profile, posts and conversations. This action cannot be undone. If you did not request it, leave this page; your account remains active.')}</p>
          {error && <p role="alert" className="rounded bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" variant="destructive" disabled={busy} className="w-full">{busy && <Loader2 className="animate-spin" aria-hidden="true" />}{busy ? t('A eliminar…', 'Deleting…') : t('Eliminar conta definitivamente', 'Permanently delete account')}</Button>
        </form>}
    </div>
  </AuthLayout>
}
