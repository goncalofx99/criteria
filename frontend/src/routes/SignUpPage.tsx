import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { Building2, Search, LayoutGrid, Eye, EyeOff, Camera, ChevronLeft, Loader2, X } from 'lucide-react'
import { signUp } from '@/lib/auth'
import { uploadFile } from '@/lib/upload'
import { UPSERT_USER, GET_ME } from '@/lib/gql'
import { warmUpBackend } from '@/lib/warmup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StepIndicator } from '@/components/auth/StepIndicator'
import { PasswordStrength, getPasswordChecks } from '@/components/auth/PasswordStrength'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { cn } from '@/lib/utils'

type Role = 'buyer' | 'seller' | 'both'

interface FormData {
  firstName: string
  lastName: string
  age: string
  role: Role | null
  avatarFile: File | null
  avatarPreview: string | null
  email: string
  password: string
  confirmPassword: string
}

const TOTAL_STEPS = 5

const roles = [
  { value: 'seller' as Role, icon: Building2, title: 'Seller', description: 'I have a property to list.' },
  { value: 'buyer'  as Role, icon: Search,    title: 'Buyer',  description: 'I\'m looking to buy.' },
  { value: 'both'   as Role, icon: LayoutGrid, title: 'Both',   description: 'I\'m buying and selling.' },
]

export default function SignUpPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', age: '', role: null,
    avatarFile: null, avatarPreview: null,
    email: '', password: '', confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null!) as React.RefObject<HTMLInputElement>
  const [upsertUser] = useMutation(UPSERT_USER)
  const keyboardHeight = useKeyboardHeight()

  useEffect(() => { warmUpBackend() }, [])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    set('avatarFile', file)
    set('avatarPreview', URL.createObjectURL(file))
  }

  function removeAvatar() {
    set('avatarFile', null)
    set('avatarPreview', null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return form.firstName.trim().length > 0 && form.lastName.trim().length > 0
      case 1: {
        const age = parseInt(form.age)
        return !isNaN(age) && age >= 18 && age <= 120
      }
      case 2: return form.role !== null
      case 3: return true // photo is optional
      case 4: {
        const checks = getPasswordChecks(form.password)
        const allPass = checks.every(c => c.passed)
        return (
          form.email.includes('@') &&
          allPass &&
          form.password === form.confirmPassword
        )
      }
      default: return false
    }
  }

  async function handleSubmit() {
    setError(null)
    setLoading(true)

    try {
      // 1. Create user account
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`
      const user = await signUp({
        email: form.email,
        password: form.password,
        fullName,
        role: form.role ?? 'buyer',
      })

      // 2. Upload avatar if provided (now that we have a token)
      let avatarUrl: string | null = null
      if (form.avatarFile) {
        try {
          avatarUrl = await uploadFile(form.avatarFile, `avatars/${user.id}`)
        } catch (err) {
          console.warn('Avatar upload failed, continuing without it:', err)
        }
      }

      // 3. Upsert user in our DB with avatar URL
      await upsertUser({
        variables: {
          input: {
            email: form.email,
            fullName,
            avatarUrl,
            role: form.role,
          },
        },
        update: (cache, { data }) => {
          if (data?.upsertUser) {
            cache.writeQuery({ query: GET_ME, data: { me: data.upsertUser } })
          }
        },
      })

      navigate('/feed', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setError(msg)
      setLoading(false)
    }
  }

  function next() {
    if (step < TOTAL_STEPS - 1) { setError(null); setStep(s => s + 1) }
    else handleSubmit()
  }

  function back() {
    if (step === 0) navigate('/')
    else { setError(null); setStep(s => s - 1) }
  }

  return (
    <div className="app-shell flex flex-col bg-background">
      {/* Top bar */}
      <div className="web-content flex items-center justify-between px-4 pt-safe pt-4 pb-2">
        <Button variant="ghost" size="icon" onClick={back} className="rounded-full text-muted-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <StepIndicator current={step} total={TOTAL_STEPS} />
        <div className="w-10" /> {/* spacer */}
      </div>

      {/* Step content */}
      <div className="web-content flex flex-1 flex-col px-6 pt-4 animate-slide-in-right">
        {step === 0 && <StepName form={form} set={set} />}
        {step === 1 && <StepAge form={form} set={set} />}
        {step === 2 && <StepRole form={form} set={set} />}
        {step === 3 && (
          <StepPhoto
            form={form}
            fileInputRef={fileInputRef}
            onChange={handleAvatarChange}
            onRemove={removeAvatar}
          />
        )}
        {step === 4 && (
          <StepAccount
            form={form}
            set={set}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirm={showConfirm}
            setShowConfirm={setShowConfirm}
            error={error}
          />
        )}
      </div>

      {/* Footer */}
      <div
        className="web-content px-6 pb-10 pb-safe space-y-3 transition-transform duration-200"
        style={keyboardHeight > 0 ? { transform: `translateY(-${keyboardHeight}px)` } : undefined}
      >
        {error && step < 4 && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive animate-fade-in">
            {error}
          </p>
        )}
        <Button
          size="lg"
          onClick={next}
          disabled={!canProceed() || loading}
          className="w-full rounded-xl"
        >
          {loading
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : step === TOTAL_STEPS - 1
              ? 'Create account'
              : step === 3
                ? form.avatarFile ? 'Continue' : 'Skip for now'
                : 'Continue'
          }
        </Button>
        {step === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/sign-in" className="font-medium text-primary hover:underline underline-offset-4">
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

// ── Step components ────────────────────────────────────────────────────────

function StepName({ form, set }: { form: FormData; set: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">What's your name?</h1>
        <p className="mt-1 text-sm text-muted-foreground">This is how you'll appear to others.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName" required>First name</Label>
          <Input
            id="firstName"
            placeholder="João"
            autoFocus
            autoComplete="given-name"
            value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName" required>Last name</Label>
          <Input
            id="lastName"
            placeholder="Silva"
            autoComplete="family-name"
            value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

function StepAge({ form, set }: { form: FormData; set: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  const age = parseInt(form.age)
  const isInvalid = form.age !== '' && (isNaN(age) || age < 18 || age > 120)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">How old are you?</h1>
        <p className="mt-1 text-sm text-muted-foreground">You must be 18 or older to use CRITERIA.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="age" required>Age</Label>
        <Input
          id="age"
          type="number"
          inputMode="numeric"
          placeholder="25"
          autoFocus
          min={18}
          max={120}
          value={form.age}
          onChange={e => set('age', e.target.value)}
          error={isInvalid}
        />
        {isInvalid && (
          <p className="text-xs text-destructive">Must be 18 or older.</p>
        )}
      </div>
    </div>
  )
}

function StepRole({ form, set }: { form: FormData; set: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">How will you use CRITERIA?</h1>
        <p className="mt-1 text-sm text-muted-foreground">You can change this any time.</p>
      </div>
      <div className="space-y-3">
        {roles.map(({ value, icon: Icon, title, description }) => (
          <button
            key={value}
            type="button"
            onClick={() => set('role', value)}
            className={cn(
              'flex w-full items-start gap-4 rounded-xl border-2 bg-surface p-4 text-left transition-all duration-150',
              form.role === value
                ? 'border-primary shadow-elevation-1'
                : 'border-border hover:border-primary-200',
            )}
          >
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
              form.role === value ? 'bg-primary text-white' : 'bg-overlay text-muted-foreground',
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function StepPhoto({
  form,
  fileInputRef,
  onChange,
  onRemove,
}: {
  form: FormData
  fileInputRef: React.RefObject<HTMLInputElement>
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Add a profile photo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Help others recognise you. You can skip this for now.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 py-6">
        <div className="relative">
          <div
            className={cn(
              'h-28 w-28 rounded-full overflow-hidden border-2 transition-colors',
              form.avatarPreview ? 'border-primary' : 'border-dashed border-border bg-overlay',
            )}
          >
            {form.avatarPreview
              ? <img src={form.avatarPreview} alt="Preview" className="h-full w-full object-cover" />
              : (
                <div className="flex h-full w-full items-center justify-center">
                  <Camera className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )
            }
          </div>

          {form.avatarPreview && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {!form.avatarPreview && (
          <div className="h-28 w-28 rounded-full bg-primary-100 flex items-center justify-center absolute opacity-0 pointer-events-none" />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onChange}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl"
        >
          <Camera className="mr-2 h-4 w-4" />
          {form.avatarPreview ? 'Change photo' : 'Choose photo'}
        </Button>
      </div>
    </div>
  )
}

function StepAccount({
  form,
  set,
  showPassword,
  setShowPassword,
  showConfirm,
  setShowConfirm,
  error,
}: {
  form: FormData
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void
  showPassword: boolean
  setShowPassword: (v: boolean) => void
  showConfirm: boolean
  setShowConfirm: (v: boolean) => void
  error: string | null
}) {
  const passwordMismatch = form.confirmPassword !== '' && form.password !== form.confirmPassword

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last step — set your email and password.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" required>Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" required>Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              autoComplete="new-password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              className="pr-11"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground tap-target"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={form.password} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" required>Confirm password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat your password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={e => set('confirmPassword', e.target.value)}
              error={passwordMismatch}
              className="pr-11"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground tap-target"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {passwordMismatch && (
            <p className="text-xs text-destructive">Passwords don't match.</p>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive animate-fade-in">
          {error}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        By creating an account you agree to our{' '}
        <span className="text-primary">Terms of Service</span> and{' '}
        <span className="text-primary">Privacy Policy</span>.
      </p>
    </div>
  )
}
