import { Check, Square } from 'lucide-react'
import { useLanguage } from '@/lib/language'

interface PasswordStrengthProps {
  password: string
}

export interface PasswordCheck {
  label: string
  passed: boolean
}

export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'Uppercase letter',       passed: /[A-Z]/.test(password) },
    { label: 'Number',                 passed: /[0-9]/.test(password) },
    { label: 'Special character',      passed: /[^A-Za-z0-9]/.test(password) },
  ]
}

export function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  const checks = getPasswordChecks(password)
  const passed = checks.filter(c => c.passed).length
  if (passed <= 1) return 0
  if (passed === 2) return 1
  if (passed === 3) return 2
  return 3
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { t } = useLanguage()
  if (!password) return null

  const checks = getPasswordChecks(password)
  const passed = checks.filter(check => check.passed).length

  return (
    <div className="mt-3 rounded bg-overlay px-4 py-3">
      <p className="text-xs font-semibold text-foreground">{t('Requisitos da palavra-passe', 'Password requirements')} <span className="font-normal text-muted-foreground">({passed} {t('de', 'of')} {checks.length})</span></p>
      <ul className="mt-2 space-y-1.5">
        {checks.map(({ label, passed: complete }) => (
          <li key={label} className="flex items-center gap-2 text-xs leading-snug text-muted-foreground">
            {complete ? <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary-600" /> : <Square aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
            <span>{label === 'At least 8 characters' ? t('Pelo menos 8 caracteres', label) : label === 'Uppercase letter' ? t('Uma letra maiúscula', label) : label === 'Number' ? t('Um número', label) : t('Um carácter especial', label)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
