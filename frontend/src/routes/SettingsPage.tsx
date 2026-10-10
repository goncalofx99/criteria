import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { Capacitor } from '@capacitor/core'
import { ArrowLeft, Loader2, LogOut, Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { useMe, type MeUser } from '@/hooks/useMe'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'
import {
  changeAccountPassword,
  requestAccountDeletion,
  requestAccountEmailChange,
  requestPasswordReset,
  signOut,
} from '@/lib/auth'
import { GET_ME, UPSERT_USER } from '@/lib/gql'
import { uploadFile } from '@/lib/upload'
import { validateUploadImage } from '@/lib/uploadKey'
import { openPrivacyPreferences } from '@/lib/privacy'
import { PasswordStrength, getPasswordChecks } from '@/components/auth/PasswordStrength'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { localizedError, useLanguage } from '@/lib/language'

function SettingsSection({ id, title, description, children, tone = 'default' }: {
  id: string
  title: string
  description: string
  children: ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <section id={id} className={cn('scroll-mt-24 border-b border-border/80 py-8 first:pt-0 last:border-b-0 md:py-10', tone === 'danger' && 'border-destructive/30')} aria-labelledby={`${id}-heading`}>
      <div className="mb-5">
        <h2 id={`${id}-heading`} className={cn('section-title', tone === 'danger' && 'text-destructive')}>{title}</h2>
        <p className="field-note mt-1">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Feedback({ error, success }: { error?: string | null; success?: string | null }) {
  return <>
    {error && <p role="alert" className="rounded bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
    {success && <p role="status" className="rounded bg-success-muted px-4 py-3 text-sm text-success">{success}</p>}
  </>
}

function ProfileSettings({ me }: { me: MeUser }) {
  const { language, t } = useLanguage()
  const [name, setName] = useState(me.fullName ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [updateUser] = useMutation(UPSERT_USER)

  useEffect(() => { setName(me.fullName ?? '') }, [me.fullName])
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const displayAvatar = removeAvatar ? null : preview ?? me.avatarUrl
  const dirty = name.trim() !== (me.fullName ?? '') || file !== null || (removeAvatar && me.avatarUrl !== null)
  const nameError = error?.startsWith('Use a name between') || error?.startsWith('Use um nome entre') || false

  function chooseFile(next: File | undefined) {
    if (!next) return
    try {
      validateUploadImage(next)
      setFile(next)
      setRemoveAvatar(false)
      setError(null)
      setSaved(false)
    } catch (cause) {
      setFile(null)
      setRemoveAvatar(false)
      setError(localizedError(cause, language, 'Escolha uma imagem válida.', 'Choose a valid image.'))
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const fullName = name.trim()
    if (fullName.length < 2 || fullName.length > 150) {
      setError(t('Use um nome entre 2 e 150 caracteres.', 'Use a name between 2 and 150 characters.'))
      return
    }
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const avatarUrl = file ? await uploadFile(file, `avatars/${me.id}`) : removeAvatar ? null : undefined
      await updateUser({
        variables: { input: { fullName, ...(avatarUrl !== undefined ? { avatarUrl } : {}) } },
        refetchQueries: [GET_ME],
        awaitRefetchQueries: true,
      })
      setFile(null)
      setRemoveAvatar(false)
      setSaved(true)
    } catch (cause) {
      setError(localizedError(cause, language, 'Não foi possível guardar o perfil. Tente novamente.', 'Could not save your profile. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  return <form onSubmit={event => { void save(event) }} className="max-w-xl space-y-5">
    <div className="flex flex-wrap items-center gap-4">
      <MemberAvatar member={{ id: me.id, fullName: name, avatarUrl: displayAvatar }} className="h-20 w-20 text-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{t('Fotografia de perfil', 'Profile photo')}</p>
        <input
          id="settings-avatar"
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t('Escolher fotografia de perfil', 'Choose a profile photo')}
          tabIndex={-1}
          onChange={event => { chooseFile(event.target.files?.[0]); event.currentTarget.value = '' }}
          className="sr-only"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} className="mt-2">{t('Escolher fotografia', 'Choose photo')}</Button>
        {file && <p className="mt-1 max-w-full truncate text-xs text-foreground" title={file.name}>{file.name} {t('selecionado', 'selected')}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{t('JPEG, PNG ou WebP, até 10 MB. As fotografias são redimensionadas e comprimidas antes do envio.', 'JPEG, PNG or WebP, up to 10 MB. Photos are resized and compressed before upload.')}</p>
        {(me.avatarUrl || file) && <button type="button" onClick={() => { setFile(null); setRemoveAvatar(true); setSaved(false) }} className="mt-1 min-h-11 text-sm font-semibold text-primary underline underline-offset-2">{t('Remover fotografia', 'Remove photo')}</button>}
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="settings-name" required>{t('Nome', 'Name')}</Label>
      <Input id="settings-name" type="text" value={name} maxLength={150} autoComplete="name" aria-describedby={error ? 'settings-profile-feedback' : undefined} error={nameError} onChange={event => { setName(event.target.value); setSaved(false); setError(null) }} required />
    </div>
    {(error || saved) && <div id="settings-profile-feedback"><Feedback error={error} success={saved ? t('O perfil foi atualizado.', 'Your profile has been updated.') : null} /></div>}
    <Button type="submit" disabled={!dirty || saving} className="min-h-11">
      {saving && <Loader2 className="animate-spin" aria-hidden="true" />}{saving ? t('A guardar…', 'Saving…') : t('Guardar perfil', 'Save profile')}
    </Button>
  </form>
}

function EmailSettings({ email }: { email: string | null }) {
  const { language, t } = useLanguage()
  const [nextEmail, setNextEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setReviewUrl(null)
    const normalized = nextEmail.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalized)) { setError(t('Introduza um endereço de email válido.', 'Enter a valid email address.')); return }
    if (normalized === email?.toLowerCase()) { setError(t('Introduza um endereço de email diferente.', 'Enter a different email address.')); return }
    setSaving(true)
    try {
      const result = await requestAccountEmailChange(normalized)
      setSuccess(t(`Enviámos um link de aprovação para ${email}. Depois de aprovar, enviaremos um link de verificação para ${normalized}.`, `We sent an approval link to ${email}. After you approve, we’ll send a verification link to ${normalized}.`))
      setReviewUrl(result.reviewUrl ?? null)
    } catch (cause) {
      setError(localizedError(cause, language, 'Não foi possível iniciar a alteração de email. Tente novamente.', 'Could not start the email change. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  return <form onSubmit={event => { void submit(event) }} className="max-w-xl space-y-4">
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{t('Endereço atual', 'Current address')}</p>
      <p className="mt-1 break-all text-sm font-medium text-foreground">{email ?? t('Sem endereço de email associado', 'No email address on file')}</p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="settings-email" required>{t('Novo endereço de email', 'New email address')}</Label>
      <Input id="settings-email" type="email" autoComplete="email" placeholder={t('nome@exemplo.pt', 'you@example.com')} value={nextEmail} aria-describedby={error ? 'settings-email-feedback' : undefined} error={!!error} onChange={event => { setNextEmail(event.target.value); setError(null); setSuccess(null); setReviewUrl(null) }} required />
    </div>
    <p className="text-xs leading-relaxed text-muted-foreground">{t('Por segurança, terá de aprovar a alteração na caixa de correio atual e depois verificar o novo endereço. O email mantém-se até concluir ambos os passos. A conta Google associada continua ligada e o email Google não é alterado.', 'For your security, you’ll approve this change from your current inbox, then verify the new address. Your email stays the same until both steps finish. A linked Google account remains connected; this does not change your Google email.')}</p>
    {(error || success) && <div id="settings-email-feedback"><Feedback error={error} success={success} /></div>}
    {reviewUrl && <Link to={reviewUrl} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2">{t('Abrir link de aprovação de teste', 'Open review approval link')}</Link>}
    <Button type="submit" disabled={saving || !nextEmail.trim() || !email} className="min-h-11">
      {saving && <Loader2 className="animate-spin" aria-hidden="true" />}{saving ? t('A enviar…', 'Sending…') : t('Pedir alteração de email', 'Request email change')}
    </Button>
  </form>
}

function PasswordSettings({ email, hasPassword }: { email: string | null; hasPassword: boolean }) {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const validNew = getPasswordChecks(next).every(check => check.passed) && next === confirm

  async function change(event: FormEvent) {
    event.preventDefault()
    if (!validNew || !current) return
    setSaving(true)
    setError(null)
    try {
      await changeAccountPassword(current, next)
      navigate('/sign-in?passwordChanged=1', { replace: true })
    } catch (cause) {
      setError(localizedError(cause, language, 'Não foi possível alterar a palavra-passe. Tente novamente.', 'Could not change your password. Try again.'))
      setSaving(false)
    }
  }

  async function setWithEmail() {
    if (!email) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await requestPasswordReset(email)
      setSuccess(t(`Enviámos um link seguro para definir a palavra-passe para ${email}.`, `We sent a secure password setup link to ${email}.`))
    } catch (cause) {
      setError(localizedError(cause, language, 'Não foi possível enviar o link. Tente novamente.', 'Could not send a password link. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  if (!hasPassword) return <div className="max-w-xl space-y-4">
    <p className="text-sm leading-relaxed text-muted-foreground">{t('Inicia sessão com o Google. Para adicionar uma palavra-passe, peça um link seguro para o seu email verificado.', 'You sign in with Google. To add a password, request a secure link at your verified email address.')}</p>
    <Feedback error={error} success={success} />
    <Button type="button" variant="outline" onClick={() => { void setWithEmail() }} disabled={saving || !email} className="min-h-11">
      {saving && <Loader2 className="animate-spin" aria-hidden="true" />}{saving ? t('A enviar…', 'Sending…') : t('Enviar link para definir palavra-passe', 'Email me a password link')}
    </Button>
  </div>

  return <form onSubmit={event => { void change(event) }} className="max-w-xl space-y-4">
    <div className="space-y-2"><Label htmlFor="settings-current-password" required>{t('Palavra-passe atual', 'Current password')}</Label><Input id="settings-current-password" type="password" autoComplete="current-password" value={current} onChange={event => setCurrent(event.target.value)} required /></div>
    <div className="space-y-2"><Label htmlFor="settings-new-password" required>{t('Nova palavra-passe', 'New password')}</Label><Input id="settings-new-password" type="password" autoComplete="new-password" value={next} onChange={event => setNext(event.target.value)} required /><PasswordStrength password={next} /></div>
    <div className="space-y-2"><Label htmlFor="settings-confirm-password" required>{t('Confirmar nova palavra-passe', 'Confirm new password')}</Label><Input id="settings-confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} error={confirm.length > 0 && next !== confirm} required />{confirm.length > 0 && next !== confirm && <p className="text-sm text-destructive">{t('As palavras-passe não coincidem.', 'Passwords do not match.')}</p>}</div>
    <p className="text-xs leading-relaxed text-muted-foreground">{t('Ao alterar a palavra-passe, a sessão termina em todos os dispositivos, incluindo este.', 'Changing your password signs out every device, including this one.')}</p>
    <Feedback error={error} />
    <Button type="submit" disabled={saving || !current || !validNew} className="min-h-11">{saving && <Loader2 className="animate-spin" aria-hidden="true" />}{saving ? t('A atualizar…', 'Updating…') : t('Alterar palavra-passe', 'Change password')}</Button>
  </form>
}

function AppearanceSettings() {
  const { t } = useLanguage()
  const { preference, setPreference } = useTheme()
  const themeOptions: { value: ThemePreference; label: string; description: string; Icon: typeof Sun }[] = [
    { value: 'system', label: t('Sistema', 'System'), description: t('Usar a definição do dispositivo', 'Match this device'), Icon: Monitor },
    { value: 'light', label: t('Claro', 'Light'), description: t('Papel quente e verde floresta', 'Warm paper and forest ink'), Icon: Sun },
    { value: 'dark', label: t('Escuro', 'Dark'), description: t('Uma paleta discreta para ambientes escuros', 'A quieter, low-light palette'), Icon: Moon },
  ]
  return <fieldset className="max-w-xl">
    <legend className="sr-only">{t('Tema de cor', 'Color theme')}</legend>
    <div className="divide-y divide-border border-y border-border">
      {themeOptions.map(({ value, label, description, Icon }) => <label key={value} className={cn('relative flex min-h-[72px] cursor-pointer items-center gap-3 px-3 py-3 transition-colors focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring', preference === value ? 'bg-primary-100' : 'hover:bg-overlay')}>
        <Icon size={19} aria-hidden="true" className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{label}</span><span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{description}</span></span>
        <input type="radio" name="color-theme" value={value} checked={preference === value} onChange={() => setPreference(value)} className="h-5 w-5 shrink-0 accent-primary" />
      </label>)}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">{t('Esta escolha fica guardada neste dispositivo.', 'This choice is saved on this device.')}</p>
  </fieldset>
}

function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage()
  return <fieldset className="max-w-xl">
    <legend className="mb-2 text-sm font-semibold text-foreground">{t('Idioma', 'Language')}</legend>
    <div className="grid grid-cols-2 gap-2">
      {(['pt', 'en'] as const).map(option => <label key={option} className={cn('flex min-h-14 cursor-pointer items-center justify-between gap-2 rounded-sm border px-3 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-ring', language === option ? 'border-primary bg-primary-100 text-primary-900' : 'border-border bg-surface text-foreground hover:bg-overlay')}>
        <span lang={option === 'pt' ? 'pt-PT' : 'en-GB'}>{option === 'pt' ? 'Português' : 'English'}</span>
        <input type="radio" name="language" value={option} checked={language === option} onChange={() => setLanguage(option)} className="h-5 w-5 shrink-0 accent-primary" />
      </label>)}
    </div>
    <p className="mt-2 text-xs text-muted-foreground">{t('O idioma é guardado neste dispositivo.', 'Your language is saved on this device.')}</p>
  </fieldset>
}

function DeleteAccountSettings({ hasPassword }: { hasPassword: boolean }) {
  const { language, t } = useLanguage()
  const confirmationWord = language === 'pt' ? 'ELIMINAR' : 'DELETE'
  const [expanded, setExpanded] = useState(false)
  const [password, setPassword] = useState('')
  const [phrase, setPhrase] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)

  async function request(event: FormEvent) {
    event.preventDefault()
    if (phrase !== confirmationWord || (hasPassword && !password)) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await requestAccountDeletion(hasPassword ? password : undefined)
      setSuccess(t('Enviámos um link de confirmação para o seu email. A conta mantém-se ativa até usar esse link.', 'We sent a confirmation link to your email. Your account remains active until you use that link.'))
      setReviewUrl(result.reviewUrl ?? null)
      setPassword('')
      setPhrase('')
    } catch (cause) {
      setError(localizedError(cause, language, 'Não foi possível pedir a eliminação da conta. Tente novamente.', 'Could not request account deletion. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  return <div className="max-w-xl space-y-4">
    <p className="text-sm leading-relaxed text-muted-foreground">{t('A eliminação da conta remove permanentemente o perfil, as publicações e as conversas. Enviaremos um link de confirmação antes de eliminar os dados.', 'Deleting your account permanently removes your profile, posts and conversations. We’ll email a final confirmation link before anything is deleted.')}</p>
    {!expanded && <Button type="button" variant="outline" onClick={() => setExpanded(true)} className="min-h-11 border-destructive/40 text-destructive hover:bg-destructive/10"><Trash2 aria-hidden="true" />{t('Eliminar conta', 'Delete account')}</Button>}
    {expanded && <form onSubmit={event => { void request(event) }} className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-destructive">{t('Pedir eliminação permanente', 'Request permanent deletion')}</h3>
      {hasPassword && <div className="space-y-2"><Label htmlFor="settings-delete-password" required>{t('Palavra-passe atual', 'Current password')}</Label><Input id="settings-delete-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></div>}
      <div className="space-y-2"><Label htmlFor="settings-delete-phrase" required>{t('Escreva ELIMINAR para continuar', 'Type DELETE to continue')}</Label><Input id="settings-delete-phrase" value={phrase} onChange={event => setPhrase(event.target.value)} autoComplete="off" spellCheck={false} required /></div>
      <Feedback error={error} success={success} />
      {reviewUrl && <Link to={reviewUrl} className="inline-flex min-h-11 items-center text-sm font-semibold text-destructive underline underline-offset-2">{t('Abrir link de confirmação de teste', 'Open review confirmation link')}</Link>}
      <div className="flex flex-wrap gap-3"><Button type="submit" variant="destructive" disabled={saving || phrase !== confirmationWord || (hasPassword && !password)} className="min-h-11">{saving && <Loader2 className="animate-spin" aria-hidden="true" />}{saving ? t('A enviar…', 'Sending…') : t('Enviar link de eliminação', 'Email deletion link')}</Button><Button type="button" variant="ghost" onClick={() => { setExpanded(false); setPassword(''); setPhrase(''); setError(null) }} className="min-h-11">{t('Cancelar', 'Cancel')}</Button></div>
    </form>}
  </div>
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { language, t } = useLanguage()
  const { me, loading, error: meError, refetch } = useMe()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const activeTab = searchParams.get('tab') === 'about' ? 'about' : 'account'
  function selectTab(tab: 'account' | 'about') {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous)
      if (tab === 'about') next.set('tab', 'about')
      else next.delete('tab')
      return next
    }, { replace: true })
  }

  async function leave() {
    setSigningOut(true)
    setSignOutError(null)
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (cause) {
      setSignOutError(localizedError(cause, language, 'Não foi possível terminar a sessão. Tente novamente.', 'Could not sign out. Try again.'))
      setSigningOut(false)
    }
  }

  if (!me) {
    if (loading) return <div role="status" aria-label={t('A carregar definições', 'Loading settings')} className="workspace-content px-5 py-7 md:px-8 lg:px-10 lg:py-10">
      <span className="sr-only">{t('A carregar definições…', 'Loading settings…')}</span>
      <div className="mx-auto max-w-5xl space-y-5"><Skeleton className="h-10 w-48" /><Skeleton className="h-8 w-64" />{[0, 1, 2, 3].map(index => <div key={index} className="grid gap-6 border-b border-border py-6 md:grid-cols-[190px_1fr]"><div className="space-y-3"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-40" /></div><div className="space-y-3"><Skeleton className="h-11 w-full max-w-xl" /><Skeleton className="h-11 w-40" /></div></div>)}</div>
    </div>
    return <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">{meError ? <><p role="alert" className="text-sm text-muted-foreground">{t('Não foi possível carregar as definições da conta.', 'Couldn’t load your account settings.')}</p><Button type="button" variant="outline" onClick={refetch} className="min-h-11">{t('Tentar novamente', 'Try again')}</Button></> : <><p role="status" className="text-sm text-muted-foreground">{t('A sua conta já não está disponível. Inicie sessão novamente para continuar.', 'Your account is no longer available. Sign in again to continue.')}</p><Button asChild variant="outline" className="min-h-11"><Link to="/sign-in">{t('Iniciar sessão', 'Sign in')}</Link></Button></>}</div>
  }

  const sections = [
    ['profile-settings', t('Perfil', 'Profile')],
    ['email-settings', 'Email'],
    ['password-settings', t('Palavra-passe', 'Password')],
    ['appearance-settings', t('Aparência', 'Appearance')],
    ...(!Capacitor.isNativePlatform() ? [['privacy-settings', t('Privacidade', 'Privacy')]] : []),
    ['delete-settings', t('Eliminar conta', 'Delete account')],
    ['about-settings', t('Sobre a CRITERIA', 'About Criteria')],
  ]

  return <div className="screen-wrap">
    <div className="mx-auto max-w-5xl">
      <Link to="/profile" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={18} aria-hidden="true" />{t('Perfil', 'Profile')}</Link>
      <div className="mb-5 mt-2 md:mb-8"><h1 className="screen-heading text-foreground">{t('Definições', 'Settings')}</h1><p className="screen-intro mt-1 max-w-xl">{t('O seu perfil, o acesso à conta e as preferências de visualização.', 'Your profile, account access and display preferences.')}</p></div>
      <div role="tablist" aria-label={t('Áreas das definições', 'Settings areas')} className="mb-5 grid grid-cols-2 border-b border-border md:hidden">
        <button id="settings-account-tab" type="button" role="tab" aria-selected={activeTab === 'account'} aria-controls="settings-account-panel" tabIndex={activeTab === 'account' ? 0 : -1} onClick={() => selectTab('account')} onKeyDown={event => { if (event.key === 'ArrowRight') { selectTab('about'); document.getElementById('settings-about-tab')?.focus() } }} className={cn('min-h-12 border-b-2 px-2 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', activeTab === 'account' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>{t('Conta', 'Account')}</button>
        <button id="settings-about-tab" type="button" role="tab" aria-selected={activeTab === 'about'} aria-controls="settings-about-panel" tabIndex={activeTab === 'about' ? 0 : -1} onClick={() => selectTab('about')} onKeyDown={event => { if (event.key === 'ArrowLeft') { selectTab('account'); document.getElementById('settings-account-tab')?.focus() } }} className={cn('min-h-12 border-b-2 px-2 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', activeTab === 'about' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>{t('Sobre a CRITERIA', 'About Criteria')}</button>
      </div>
      <div className={cn('mb-6 border-y border-border py-3 lg:hidden', activeTab === 'about' && 'hidden md:block')}>
        <label htmlFor="settings-jump" className="mb-1.5 block text-xs font-semibold text-muted-foreground">{t('Ir para a secção', 'Jump to section')}</label>
        <select
          id="settings-jump"
          defaultValue=""
          onChange={event => {
            const id = event.target.value
            if (id === 'about-settings') selectTab('about')
            requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }))
          }}
          className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>{t('Selecione uma secção', 'Select a section')}</option>
          {sections.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
      <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-12">
      <nav aria-label={t('Secções das definições', 'Settings sections')} className="hidden lg:sticky lg:top-24 lg:mx-0 lg:flex lg:flex-col lg:self-start">
        {sections.map(([id, label]) => <a key={id} href={`#${id}`} className="inline-flex min-h-11 shrink-0 items-center border-b border-transparent px-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground focus-visible:text-foreground lg:w-full lg:border-b-0 lg:border-l lg:hover:bg-accent">{label}</a>)}
      </nav>
      <div className="min-w-0">
        <div id="settings-account-panel" role="tabpanel" aria-labelledby="settings-account-tab" className={cn(activeTab === 'about' && 'hidden md:block')}>
          <SettingsSection id="profile-settings" title={t('Perfil', 'Profile')} description={t('Como os outros membros o veem na CRITERIA.', 'How other members see you on CRITERIA.')}><ProfileSettings me={me} /></SettingsSection>
          <SettingsSection id="email-settings" title={t('Endereço de email', 'Email address')} description={t('As mensagens de acesso e da conta chegam a este endereço.', 'Your sign-in and account messages go here.')}><EmailSettings email={me.email} /></SettingsSection>
          <SettingsSection id="password-settings" title={t('Palavra-passe', 'Password')} description={t('Controle o acesso à sua conta.', 'Control access to your account.')}><PasswordSettings email={me.email} hasPassword={me.hasPassword} /></SettingsSection>
          <SettingsSection id="appearance-settings" title={t('Aparência', 'Appearance')} description={t('Escolha o aspeto da CRITERIA neste dispositivo.', 'Choose how CRITERIA looks on this device.')}><div className="space-y-8"><AppearanceSettings /><div className={Capacitor.isNativePlatform() ? undefined : 'md:hidden'}><LanguageSettings /></div></div></SettingsSection>
          {!Capacitor.isNativePlatform() && <SettingsSection id="privacy-settings" title={t('Privacidade', 'Privacy')} description={t('Reveja as escolhas de armazenamento e análise deste navegador.', 'Review storage and analytics choices for this browser.')}><div className="max-w-xl space-y-3"><p className="text-sm leading-relaxed text-muted-foreground">{t('Reveja a sua escolha sobre análise opcional, incluindo retirar o consentimento quando a análise estiver configurada. O armazenamento essencial mantém a sessão e as preferências de visualização.', 'Review your optional analytics choice here, including withdrawing consent when analytics is configured. Essential browser storage keeps sign-in and display preferences working.')}</p><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={openPrivacyPreferences} className="min-h-11">{t('Escolhas de privacidade e análise', 'Privacy & analytics choices')}</Button><Link to="/privacy" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2">{t('Ler a política de privacidade', 'Read full privacy page')}</Link></div></div></SettingsSection>}
          <SettingsSection id="delete-settings" title={t('Eliminar conta', 'Delete account')} description={t('Uma ação permanente que requer confirmação por email.', 'A permanent action that requires email confirmation.')} tone="danger"><DeleteAccountSettings hasPassword={me.hasPassword} /></SettingsSection>
          <div className="mt-7 border-t border-border pt-6"><Feedback error={signOutError} /><Button type="button" variant="ghost" onClick={() => { void leave() }} disabled={signingOut} className="min-h-11"><LogOut aria-hidden="true" />{signingOut ? t('A terminar sessão…', 'Signing out…') : t('Terminar sessão', 'Sign out')}</Button></div>
        </div>
        <div id="settings-about-panel" role="tabpanel" aria-labelledby="settings-about-tab" className={cn(activeTab === 'account' && 'hidden md:block')}>
          <SettingsSection id="about-settings" title={t('Sobre a CRITERIA', 'About Criteria')} description={t('Informações, documentos e contacto.', 'Information, documents and contact.')}>
            <div className="max-w-xl">
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{t('Um lugar para juntar imóveis e critérios de compradores. Operado por Gonçalo Félix.', 'A place for property listings and buyer criteria to meet. Operated by Gonçalo Félix.')}</p>
              <div className="divide-y divide-border border-y border-border text-sm font-semibold">
                <Link to="/privacy" className="flex min-h-14 items-center text-primary hover:underline">{t('Política de privacidade', 'Privacy policy')}</Link>
                <Link to="/terms" className="flex min-h-14 items-center text-primary hover:underline">{t('Termos e condições', 'Terms and conditions')}</Link>
                <a href="mailto:criteriaappportugal@gmail.com" className="flex min-h-14 items-center break-all text-primary hover:underline">criteriaappportugal@gmail.com</a>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>
      </div>
    </div>
  </div>
}
