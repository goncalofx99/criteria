/**
 * Post-Google-OAuth onboarding.
 * Google gives us name + avatar — we still need age and role.
 */
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Loader2 } from 'lucide-react'
import { UPSERT_USER, GET_ME } from '@/lib/gql'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { RoleChoice } from '@/components/auth/RoleChoice'
import { rememberAuthDestination, safeInternalPath, takeAuthDestination } from '@/lib/returnTo'
import { localizedError, useLanguage } from '@/lib/language'

type Role = 'buyer' | 'seller' | 'both'

export default function Onboarding() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    const next = new URLSearchParams(location.search).get('next')
    if (next) rememberAuthDestination(safeInternalPath(next))
  }, [location.search])
  const [step, setStep] = useState(0) // 0 = age, 1 = role
  const stepContentRef = useRef<HTMLFormElement>(null)
  const previousStep = useRef(step)
  const [age, setAge] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [upsertUser] = useMutation(UPSERT_USER)
  const { data: meData, loading: meLoading, error: meError, refetch: refetchMe } = useQuery(GET_ME)

  const ageNum = Number(age)
  const ageValid = age !== '' && Number.isInteger(ageNum) && ageNum >= 18 && ageNum <= 120

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

  async function finish() {
    if (!role || !ageValid) return
    setLoading(true)
    setError(null)
    try {
      const me = meData?.me
      if (!me?.email) throw new Error(t('A sua conta ainda está a carregar. Tente novamente.', 'Your account is still loading. Please try again.'))

      await upsertUser({
        variables: {
          input: {
            email: me.email,
            ...(me.fullName ? { fullName: me.fullName } : {}),
            ...(me.avatarUrl ? { avatarUrl: me.avatarUrl } : {}),
            role,
            age: ageNum,
          },
        },
        update: (cache, { data }) => {
          if (data?.upsertUser) {
            cache.writeQuery({ query: GET_ME, data: { me: data.upsertUser } })
          }
        },
      })
      navigate(takeAuthDestination('/'), { replace: true })
    } catch (err) {
      setError(localizedError(err, language, 'Não foi possível guardar os seus dados. Tente novamente.', 'Something went wrong.'))
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      onBack={step === 1 ? () => { setError(null); setStep(0) } : undefined}
      backLabel={t('Passo anterior', 'Previous step')}
      step={{ current: step, total: 2 }}
      footer={<div className="mx-auto max-w-md"><Button type="submit" form="onboarding-flow" size="lg" className="w-full" disabled={step === 0 ? !ageValid : !role || loading || meLoading || !!meError}>
        {loading ? <><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{t('A guardar…', 'Saving…')}</> : step === 0 ? t('Continuar', 'Continue') : t('Começar', 'Get started')}
      </Button></div>}
    >
      <form id="onboarding-flow" ref={stepContentRef} onSubmit={event => { event.preventDefault(); if (step === 0 && ageValid) setStep(1); else void finish() }} className="w-full max-w-md self-center">
        {step === 0 ? (
          <div className="space-y-6">
            <div>
              <h1 tabIndex={-1} className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">{t('Qual é a sua idade?', 'How old are you?')}</h1>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t('Tem de ter pelo menos 18 anos para utilizar a CRITERIA.', 'You must be 18 or older to use CRITERIA.')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="age" required>{t('Idade', 'Age')}</Label>
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                placeholder="25"
                min={18}
                max={120}
                required
                value={age}
                onChange={e => setAge(e.target.value)}
                error={age !== '' && !ageValid}
                aria-describedby={age !== '' && !ageValid ? 'onboarding-age-error' : undefined}
              />
              {age !== '' && !ageValid && (
                <p id="onboarding-age-error" role="alert" className="text-sm text-destructive">{t('Introduza uma idade entre 18 e 120 anos.', 'Enter an age between 18 and 120.')}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 tabIndex={-1} className="text-[2rem] font-semibold leading-tight tracking-[-.03em] text-foreground">{t('Como vai utilizar a CRITERIA?', 'How will you use CRITERIA?')}</h1>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t('Escolha a opção que faz sentido agora. Pode alterá-la mais tarde.', 'Choose what fits today. You can change this later.')}</p>
            </div>
            <RoleChoice value={role} onChange={setRole} />
            {meError && <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{t('Não foi possível carregar a sua conta. Verifique a ligação e tente novamente.', 'Could not load your account. Check your connection and try again.')}</p><Button type="button" variant="outline" onClick={() => { void refetchMe() }} className="min-h-11">{t('Tentar novamente', 'Try again')}</Button></div>}
            {error && (
              <p role="alert" className="rounded bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
      </form>
    </AuthLayout>
  )
}
