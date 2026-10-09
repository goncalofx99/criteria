import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

function SettingsSection({ id, title, description, children, tone = 'default' }: {
  id: string
  title: string
  description: string
  children: ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <section id={id} className={cn('surface-panel scroll-mt-24 p-5 sm:p-7', tone === 'danger' && 'border-destructive/30')} aria-labelledby={`${id}-heading`}>
      <div className="grid gap-5 md:grid-cols-[minmax(0,190px)_minmax(0,1fr)] md:gap-8 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div>
          <h2 id={`${id}-heading`} className={cn('text-lg font-semibold', tone === 'danger' && 'text-destructive')}>{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  )
}

function Feedback({ error, success }: { error?: string | null; success?: string | null }) {
  return <>
    {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
    {success && <p role="status" className="rounded-xl bg-success-muted px-4 py-3 text-sm text-success">{success}</p>}
  </>
}

function ProfileSettings({ me }: { me: MeUser }) {
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
      setError(cause instanceof Error ? cause.message : 'Choose a valid image.')
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const fullName = name.trim()
    if (fullName.length < 2 || fullName.length > 150) {
      setError('Use a name between 2 and 150 characters.')
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
      setError(cause instanceof Error ? cause.message : 'Could not save your profile. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return <form onSubmit={event => { void save(event) }} className="max-w-xl space-y-5">
    <div className="flex flex-wrap items-center gap-4">
      <MemberAvatar member={{ id: me.id, fullName: name, avatarUrl: displayAvatar }} className="h-20 w-20 text-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Profile photo</p>
        <input
          id="settings-avatar"
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Choose a profile photo"
          tabIndex={-1}
          onChange={event => { chooseFile(event.target.files?.[0]); event.currentTarget.value = '' }}
          className="sr-only"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} className="mt-2 min-h-10">Choose photo</Button>
        {file && <p className="mt-1 max-w-full truncate text-xs text-foreground" title={file.name}>{file.name} selected</p>}
        <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG or WebP, up to 10 MB. Photos are resized and compressed before upload.</p>
        {(me.avatarUrl || file) && <button type="button" onClick={() => { setFile(null); setRemoveAvatar(true); setSaved(false) }} className="mt-1 min-h-10 text-sm font-semibold text-primary underline underline-offset-2">Remove photo</button>}
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="settings-name" required>Name</Label>
      <Input id="settings-name" type="text" value={name} maxLength={150} autoComplete="name" onChange={event => { setName(event.target.value); setSaved(false) }} required />
    </div>
    <Feedback error={error} success={saved ? 'Your profile has been updated.' : null} />
    <Button type="submit" disabled={!dirty || saving} className="min-h-11">
      {saving && <Loader2 className="animate-spin" aria-hidden="true" />}{saving ? 'Saving…' : 'Save profile'}
    </Button>
  </form>
}

function EmailSettings({ email }: { email: string | null }) {
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
    if (!/^\S+@\S+\.\S+$/.test(normalized)) { setError('Enter a valid email address.'); return }
    if (normalized === email?.toLowerCase()) { setError('Enter a different email address.'); return }
    setSaving(true)
    try {
      const result = await requestAccountEmailChange(normalized)
      setSuccess(`We sent an approval link to ${email}. After you approve, we’ll send a verification link to ${normalized}.`)
      setReviewUrl(result.reviewUrl ?? null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the email change. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return <form onSubmit={event => { void submit(event) }} className="max-w-xl space-y-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current address</p>
      <p className="mt-1 break-all text-sm font-medium text-foreground">{email ?? 'No email address on file'}</p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="settings-email" required>New email address</Label>
      <Input id="settings-email" type="email" autoComplete="email" placeholder="you@example.com" value={nextEmail} onChange={event => { setNextEmail(event.target.value); setError(null); setSuccess(null); setReviewUrl(null) }} required />
    </div>
    <p className="text-xs leading-relaxed text-muted-foreground">For your security, you’ll approve this change from your current inbox, then verify the new address. Your email stays the same until both steps finish. A linked Google account remains connected; this does not change your Google email.</p>
    <Feedback error={error} success={success} />
    {reviewUrl && <Link to={reviewUrl} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2">Open review approval link</Link>}
    <Button type="submit" disabled={saving || !nextEmail.trim() || !email} className="min-h-11">
      {saving && <Loader2 className="animate-spin" aria-hidden="true" />}{saving ? 'Sending…' : 'Request email change'}
    </Button>
  </form>
}

function PasswordSettings({ email, hasPassword }: { email: string | null; hasPassword: boolean }) {
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
      setError(cause instanceof Error ? cause.message : 'Could not change your password. Try again.')
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
      setSuccess(`We sent a secure password setup link to ${email}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send a password link. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!hasPassword) return <div className="max-w-xl space-y-4">
    <p className="text-sm leading-relaxed text-muted-foreground">You sign in with Google. To add a password, request a secure link at your verified email address.</p>
    <Feedback error={error} success={success} />
    <Button type="button" variant="outline" onClick={() => { void setWithEmail() }} disabled={saving || !email} className="min-h-11">
      {saving && <Loader2 className="animate-spin" aria-hidden="true" />}{saving ? 'Sending…' : 'Email me a password link'}
    </Button>
  </div>

  return <form onSubmit={event => { void change(event) }} className="max-w-xl space-y-4">
    <div className="space-y-2"><Label htmlFor="settings-current-password" required>Current password</Label><Input id="settings-current-password" type="password" autoComplete="current-password" value={current} onChange={event => setCurrent(event.target.value)} required /></div>
    <div className="space-y-2"><Label htmlFor="settings-new-password" required>New password</Label><Input id="settings-new-password" type="password" autoComplete="new-password" value={next} onChange={event => setNext(event.target.value)} required /><PasswordStrength password={next} /></div>
    <div className="space-y-2"><Label htmlFor="settings-confirm-password" required>Confirm new password</Label><Input id="settings-confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} error={confirm.length > 0 && next !== confirm} required />{confirm.length > 0 && next !== confirm && <p className="text-sm text-destructive">Passwords do not match.</p>}</div>
    <p className="text-xs leading-relaxed text-muted-foreground">Changing your password signs out every device, including this one.</p>
    <Feedback error={error} />
    <Button type="submit" disabled={saving || !current || !validNew} className="min-h-11">{saving && <Loader2 className="animate-spin" aria-hidden="true" />}{saving ? 'Updating…' : 'Change password'}</Button>
  </form>
}

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System', description: 'Match this device', Icon: Monitor },
  { value: 'light', label: 'Light', description: 'Warm paper and forest ink', Icon: Sun },
  { value: 'dark', label: 'Dark', description: 'A quieter, low-light palette', Icon: Moon },
]

function AppearanceSettings() {
  const { preference, setPreference } = useTheme()
  return <fieldset className="max-w-xl">
    <legend className="sr-only">Color theme</legend>
    <div className="grid gap-2 sm:grid-cols-3">
      {THEME_OPTIONS.map(({ value, label, description, Icon }) => <label key={value} className={cn('flex min-h-28 cursor-pointer flex-col rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring', preference === value ? 'border-primary bg-primary-100' : 'border-border bg-surface hover:border-primary-200')}>
        <span className="flex items-center justify-between gap-2"><Icon size={19} aria-hidden="true" className="text-primary" /><input type="radio" name="color-theme" value={value} checked={preference === value} onChange={() => setPreference(value)} className="h-4 w-4 accent-primary" /></span>
        <span className="mt-3 text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</span>
      </label>)}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">This choice is saved on this device.</p>
  </fieldset>
}

function DeleteAccountSettings({ hasPassword }: { hasPassword: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [password, setPassword] = useState('')
  const [phrase, setPhrase] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)

  async function request(event: FormEvent) {
    event.preventDefault()
    if (phrase !== 'DELETE' || (hasPassword && !password)) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await requestAccountDeletion(hasPassword ? password : undefined)
      setSuccess('We sent a confirmation link to your email. Your account remains active until you use that link.')
      setReviewUrl(result.reviewUrl ?? null)
      setPassword('')
      setPhrase('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not request account deletion. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="max-w-xl space-y-4">
    <p className="text-sm leading-relaxed text-muted-foreground">Deleting your account permanently removes your profile, posts and conversations. We’ll email a final confirmation link before anything is deleted.</p>
    {!expanded && <Button type="button" variant="outline" onClick={() => setExpanded(true)} className="min-h-11 border-destructive/40 text-destructive hover:bg-destructive/10"><Trash2 aria-hidden="true" />Delete account</Button>}
    {expanded && <form onSubmit={event => { void request(event) }} className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-destructive">Request permanent deletion</h3>
      {hasPassword && <div className="space-y-2"><Label htmlFor="settings-delete-password" required>Current password</Label><Input id="settings-delete-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></div>}
      <div className="space-y-2"><Label htmlFor="settings-delete-phrase" required>Type DELETE to continue</Label><Input id="settings-delete-phrase" value={phrase} onChange={event => setPhrase(event.target.value)} autoComplete="off" spellCheck={false} required /></div>
      <Feedback error={error} success={success} />
      {reviewUrl && <Link to={reviewUrl} className="inline-flex min-h-11 items-center text-sm font-semibold text-destructive underline underline-offset-2">Open review confirmation link</Link>}
      <div className="flex flex-wrap gap-3"><Button type="submit" variant="destructive" disabled={saving || phrase !== 'DELETE' || (hasPassword && !password)} className="min-h-11">{saving && <Loader2 className="animate-spin" aria-hidden="true" />}{saving ? 'Sending…' : 'Email deletion link'}</Button><Button type="button" variant="ghost" onClick={() => { setExpanded(false); setPassword(''); setPhrase(''); setError(null) }} className="min-h-11">Cancel</Button></div>
    </form>}
  </div>
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { me, loading, error: meError, refetch } = useMe()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  async function leave() {
    setSigningOut(true)
    setSignOutError(null)
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (cause) {
      setSignOutError(cause instanceof Error ? cause.message : 'Could not sign out. Try again.')
      setSigningOut(false)
    }
  }

  if (!me) {
    if (loading) return <div role="status" aria-label="Loading settings" className="workspace-content px-5 py-7 md:px-8 lg:px-10 lg:py-10">
      <span className="sr-only">Loading settings…</span>
      <div className="mx-auto max-w-5xl space-y-5"><Skeleton className="h-10 w-48" /><Skeleton className="h-8 w-64" />{[0, 1, 2, 3].map(index => <div key={index} className="grid gap-6 rounded-2xl border border-border bg-surface p-6 md:grid-cols-[190px_1fr]"><div className="space-y-3"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-40" /></div><div className="space-y-3"><Skeleton className="h-11 w-full max-w-xl" /><Skeleton className="h-11 w-40" /></div></div>)}</div>
    </div>
    return <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">{meError ? <><p role="alert" className="text-sm text-muted-foreground">Couldn’t load your account settings.</p><Button type="button" variant="outline" onClick={refetch} className="min-h-11">Try again</Button></> : <><p role="status" className="text-sm text-muted-foreground">Your account is no longer available. Sign in again to continue.</p><Button asChild variant="outline" className="min-h-11"><Link to="/sign-in">Sign in</Link></Button></>}</div>
  }

  return <div className="workspace-content px-5 py-7 md:px-8 lg:px-10 lg:py-10">
    <div className="mx-auto max-w-5xl">
      <Link to="/profile" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={18} aria-hidden="true" />Back to profile</Link>
      <div className="mb-7 mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="editorial-kicker">Your account</p><h1 className="editorial-title mt-2">Settings</h1><p className="editorial-subtitle mt-2 max-w-xl text-sm">Keep your profile, account access and viewing preferences up to date.</p></div></div>
      <div className="space-y-5">
        <SettingsSection id="profile-settings" title="Profile" description="How other members see you on CRITERIA."><ProfileSettings me={me} /></SettingsSection>
        <SettingsSection id="email-settings" title="Email address" description="Your sign-in and account messages go here."><EmailSettings email={me.email} /></SettingsSection>
        <SettingsSection id="password-settings" title="Password" description="Control access to your account."><PasswordSettings email={me.email} hasPassword={me.hasPassword} /></SettingsSection>
        <SettingsSection id="appearance-settings" title="Appearance" description="Choose how CRITERIA looks on this device."><AppearanceSettings /></SettingsSection>
        {!Capacitor.isNativePlatform() && <SettingsSection id="privacy-settings" title="Privacy" description="Review storage and analytics choices for this browser."><div className="max-w-xl space-y-3"><p className="text-sm leading-relaxed text-muted-foreground">Review your optional analytics choice here, including withdrawing consent when analytics is configured. Essential browser storage keeps sign-in and display preferences working.</p><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={openPrivacyPreferences} className="min-h-11">Privacy &amp; analytics choices</Button><Link to="/privacy" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2">Read full privacy page</Link></div></div></SettingsSection>}
        <SettingsSection id="delete-settings" title="Delete account" description="A permanent action that requires email confirmation." tone="danger"><DeleteAccountSettings hasPassword={me.hasPassword} /></SettingsSection>
      </div>
      <div className="mt-7 border-t border-border pt-6"><Feedback error={signOutError} /><Button type="button" variant="ghost" onClick={() => { void leave() }} disabled={signingOut} className="min-h-11"><LogOut aria-hidden="true" />{signingOut ? 'Signing out…' : 'Sign out'}</Button></div>
    </div>
  </div>
}
