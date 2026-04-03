/**
 * Post-Google-OAuth onboarding.
 * Google gives us name + avatar — we still need age and role.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { Building2, Search, LayoutGrid, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { UPSERT_USER } from '@/lib/gql'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StepIndicator } from '@/components/auth/StepIndicator'
import { cn } from '@/lib/utils'

type Role = 'buyer' | 'seller' | 'both'

const roles = [
  { value: 'seller' as Role, icon: Building2, title: 'Seller', description: 'I have a property to list.' },
  { value: 'buyer'  as Role, icon: Search,    title: 'Buyer',  description: 'I\'m looking to buy.' },
  { value: 'both'   as Role, icon: LayoutGrid, title: 'Both',   description: 'I\'m buying and selling.' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0) // 0 = age, 1 = role
  const [age, setAge] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [upsertUser] = useMutation(UPSERT_USER)

  const ageNum = parseInt(age)
  const ageValid = !isNaN(ageNum) && ageNum >= 18 && ageNum <= 120

  async function finish() {
    if (!role) return
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Store age in Supabase user metadata
      await supabase.auth.updateUser({ data: { age: ageNum } })

      await upsertUser({
        variables: {
          input: {
            email: user.email!,
            fullName: user.user_metadata?.full_name ?? null,
            avatarUrl: user.user_metadata?.avatar_url ?? null,
            role,
          },
        },
      })
      navigate('/feed', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="app-shell flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-center px-4 pt-safe pt-6 pb-2">
        <StepIndicator current={step} total={2} />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-6 pt-6 animate-slide-in-right">
        {step === 0 ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">One more thing</h1>
              <p className="mt-1 text-sm text-muted-foreground">How old are you?</p>
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
                value={age}
                onChange={e => setAge(e.target.value)}
                error={age !== '' && !ageValid}
              />
              {age !== '' && !ageValid && (
                <p className="text-xs text-destructive">Must be 18 or older.</p>
              )}
            </div>
          </div>
        ) : (
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
                  onClick={() => setRole(value)}
                  className={cn(
                    'flex w-full items-start gap-4 rounded-xl border-2 bg-surface p-4 text-left transition-all duration-150',
                    role === value
                      ? 'border-primary shadow-elevation-1'
                      : 'border-border hover:border-primary-200',
                  )}
                >
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                    role === value ? 'bg-primary text-white' : 'bg-overlay text-muted-foreground',
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
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-10 pb-safe">
        <Button
          size="lg"
          className="w-full rounded-xl"
          disabled={step === 0 ? !ageValid : !role || loading}
          onClick={() => {
            if (step === 0) setStep(1)
            else finish()
          }}
        >
          {loading
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : step === 0 ? 'Continue' : 'Get started'
          }
        </Button>
      </div>
    </div>
  )
}
