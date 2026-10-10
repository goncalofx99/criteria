import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { signUp } from '@/lib/auth'
import { warmUpBackend } from '@/lib/warmup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { RoleChoice } from '@/components/auth/RoleChoice'
import { PasswordStrength, getPasswordChecks } from '@/components/auth/PasswordStrength'
import { rememberAuthDestination, safeInternalPath, takeAuthDestination } from '@/lib/returnTo'
import { localizedError, useLanguage } from '@/lib/language'

type Role = 'buyer' | 'seller' | 'both'

interface FormData {
  firstName: string
  lastName: string
  age: string
  role: Role | null
  email: string
  password: string
  confirmPassword: string
}

const TOTAL_STEPS = 4

function isValidSignupEmail(value: string): boolean {
  const email = value.trim()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function SignUpPage() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', age: '', role: null,
    email: '', password: '', confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stepContentRef = useRef<HTMLFormElement>(null)
  const previousStep = useRef(step)

  useEffect(() => { warmUpBackend() }, [])
  useEffect(() => {
    const next = new URLSearchParams(location.search).get('next')
    if (next) rememberAuthDestination(safeInternalPath(next))
  }, [location.search])
  useEffect(() => {
    if (previousStep.current === step) return
    previousStep.current = step
    const frame = requestAnimationFrame(() => {
      const heading = stepContentRef.current?.querySelector<HTMLHeadingElement>('h1')
      heading?.focus({ preventScroll: true })
      heading?.scrollIntoView({ block: 'start', behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [step])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return form.firstName.trim().length > 0 && form.lastName.trim().length > 0 &&
        `${form.firstName.trim()} ${form.lastName.trim()}`.length <= 150
      case 1: {
        const age = Number(form.age)
        return form.age !== '' && Number.isInteger(age) && age >= 18 && age <= 120
      }
      case 2: return form.role !== null
      case 3: {
        const checks = getPasswordChecks(form.password)
        const allPass = checks.every(c => c.passed)
        return (
          isValidSignupEmail(form.email) &&
          allPass &&
          form.password.length <= 1024 &&
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
      // An account is created only after the email link is confirmed.
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`
      const user = await signUp({
        email: form.email.trim(),
        password: form.password,
        fullName,
        role: form.role ?? 'buyer',
        age: Number(form.age),
      })

      if (!user) {
        navigate('/check-email', { replace: true })
        return
      }

      navigate(takeAuthDestination('/'), { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error && err.message === 'An account with this email already exists'
        ? t('Já existe uma conta com este endereço de email.', 'An account with this email already exists')
        : localizedError(err, language, 'Não foi possível criar a conta. Verifique os dados e tente novamente.', 'Something went wrong.'))
      setLoading(false)
    }
  }

  function next() {
    if (!canProceed() || loading) return
    if (step < TOTAL_STEPS - 1) { setError(null); setStep(s => s + 1) }
    else void handleSubmit()
  }

  function back() {
    if (step === 0) navigate('/')
    else { setError(null); setStep(s => s - 1) }
  }

  return (
    <AuthLayout
      onBack={back}
      backLabel={step === 0 ? t('Voltar ao início', 'Back to home') : t('Passo anterior', 'Previous step')}
      step={{ current: step, total: TOTAL_STEPS }}
      footer={<div className="mx-auto max-w-md space-y-3">
        {error && step < TOTAL_STEPS - 1 && <p role="alert" className="rounded bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" form="signup-flow" size="lg" disabled={!canProceed() || loading} className="w-full">
          {loading ? <><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{t('A criar conta…', 'Creating account…')}</> : step === TOTAL_STEPS - 1 ? t('Criar conta', 'Create account') : t('Continuar', 'Continue')}
        </Button>
        {step === TOTAL_STEPS - 1 && <p className="text-center text-xs leading-relaxed text-muted-foreground">{t('Antes de criar uma conta, leia os nossos ', 'Before creating an account, read our ')}<Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline underline-offset-2">{t('Termos e condições', 'Terms and conditions')}</Link>{t(' e a ', ' and ')}<Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline underline-offset-2">{t('Política de privacidade', 'Privacy policy')}</Link>.</p>}
        {step === 0 && <p className="text-center text-sm text-muted-foreground">{t('Já tem conta?', 'Already have an account?')}{' '}<Link to={`/sign-in${location.search}`} className="font-semibold text-primary underline underline-offset-4">{t('Iniciar sessão', 'Sign in')}</Link></p>}
      </div>}
    >
      <form id="signup-flow" ref={stepContentRef} onSubmit={event => { event.preventDefault(); next() }} className="w-full max-w-md self-center">
        {step === 0 && <StepName form={form} set={set} />}
        {step === 1 && <StepAge form={form} set={set} />}
        {step === 2 && <StepRole form={form} set={set} />}
        {step === 3 && (
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
      </form>
    </AuthLayout>
  )
}

// ── Step components ────────────────────────────────────────────────────────

function StepName({ form, set }: { form: FormData; set: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  const { t } = useLanguage()
  const nameTooLong = `${form.firstName.trim()} ${form.lastName.trim()}`.length > 150
  return (
    <div className="space-y-6">
      <div>
        <h1 tabIndex={-1} className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">{t('Como se chama?', 'What is your name?')}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t('É o nome que os outros membros vão ver.', 'This is how other members will see you.')}</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName" required>{t('Nome próprio', 'First name')}</Label>
          <Input
            id="firstName"
            placeholder="João"
            autoComplete="given-name"
            maxLength={150}
            required
            error={nameTooLong}
            aria-describedby={nameTooLong ? 'signup-name-error' : undefined}
            value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName" required>{t('Apelido', 'Last name')}</Label>
          <Input
            id="lastName"
            placeholder="Silva"
            autoComplete="family-name"
            maxLength={150}
            required
            error={nameTooLong}
            aria-describedby={nameTooLong ? 'signup-name-error' : undefined}
            value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
          />
        </div>
        {nameTooLong && <p id="signup-name-error" role="alert" className="text-xs text-destructive">{t('O nome completo não pode ultrapassar 150 caracteres.', 'Your full name must be 150 characters or fewer.')}</p>}
      </div>
    </div>
  )
}

function StepAge({ form, set }: { form: FormData; set: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  const { t } = useLanguage()
  const age = Number(form.age)
  const isInvalid = form.age !== '' && (!Number.isInteger(age) || age < 18 || age > 120)

  return (
    <div className="space-y-6">
      <div>
        <h1 tabIndex={-1} className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">{t('Qual é a sua idade?', 'How old are you?')}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t('Tem de ter pelo menos 18 anos para utilizar a CRITERIA.', 'You must be 18 or older to use CRITERIA.')}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="age" required>{t('Idade', 'Age')}</Label>
        <Input
          id="age"
          type="number"
          inputMode="numeric"
          placeholder="25"
          min={18}
          max={120}
          required
          value={form.age}
          onChange={e => set('age', e.target.value)}
          error={isInvalid}
          aria-describedby={isInvalid ? 'signup-age-error' : undefined}
        />
        {isInvalid && (
          <p id="signup-age-error" role="alert" className="text-sm text-destructive">{t('Introduza uma idade entre 18 e 120 anos.', 'Enter an age between 18 and 120.')}</p>
        )}
      </div>
    </div>
  )
}

function StepRole({ form, set }: { form: FormData; set: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  const { t } = useLanguage()
  return (
    <div className="space-y-6">
      <div>
        <h1 tabIndex={-1} className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">{t('Como vai utilizar a CRITERIA?', 'How will you use CRITERIA?')}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t('Escolha a opção que faz sentido agora. Pode alterá-la mais tarde.', 'Choose what fits today. You can change this later.')}</p>
      </div>
      <RoleChoice value={form.role} onChange={role => set('role', role)} />
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
  const { t } = useLanguage()
  const passwordMismatch = form.confirmPassword !== '' && form.password !== form.confirmPassword
  const emailInvalid = form.email.trim() !== '' && !isValidSignupEmail(form.email)
  const passwordTooLong = form.password.length > 1024

  return (
    <div className="space-y-5">
      <div>
        <h1 tabIndex={-1} className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">{t('Crie a sua conta', 'Create your account')}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t('Introduza um email e uma palavra-passe para terminar.', 'Add an email and password to finish.')}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" required>Email</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('nome@exemplo.pt', 'you@example.com')}
            autoComplete="email"
            maxLength={254}
            required
            error={emailInvalid}
            aria-describedby={emailInvalid ? 'signup-email-error' : undefined}
            value={form.email}
            onChange={e => set('email', e.target.value)}
          />
          {emailInvalid && <p id="signup-email-error" role="alert" className="text-xs text-destructive">{t('Introduza um endereço de email completo, como nome@exemplo.pt.', 'Enter a complete email address, such as name@example.com.')}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" required>{t('Palavra-passe', 'Password')}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('Crie uma palavra-passe forte', 'Create a strong password')}
              autoComplete="new-password"
              maxLength={1024}
              required
              value={form.password}
              onChange={e => set('password', e.target.value)}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('Ocultar palavra-passe', 'Hide password') : t('Mostrar palavra-passe', 'Show password')}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-1 flex w-11 items-center justify-center text-muted-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={form.password} />
          {passwordTooLong && <p role="alert" className="text-xs text-destructive">{t('A palavra-passe não pode ultrapassar 1024 caracteres.', 'Password must be 1024 characters or fewer.')}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" required>{t('Confirmar palavra-passe', 'Confirm password')}</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder={t('Repita a palavra-passe', 'Repeat your password')}
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={e => set('confirmPassword', e.target.value)}
              error={passwordMismatch}
              aria-describedby={passwordMismatch ? 'signup-password-match-error' : undefined}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? t('Ocultar confirmação da palavra-passe', 'Hide confirmation password') : t('Mostrar confirmação da palavra-passe', 'Show confirmation password')}
              aria-pressed={showConfirm}
              className="absolute inset-y-0 right-1 flex w-11 items-center justify-center text-muted-foreground"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {passwordMismatch && (
            <p id="signup-password-match-error" role="alert" className="text-sm text-destructive">{t('As palavras-passe não coincidem.', 'Passwords do not match.')}</p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('O seu nome e a fotografia opcional podem aparecer nos anúncios de imóveis públicos. O seu email permanece privado.', 'Your name and optional photo may appear on public property listings. Your email stays private.')}
      </p>
    </div>
  )
}
