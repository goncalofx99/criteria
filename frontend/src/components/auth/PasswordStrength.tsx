import { cn } from '@/lib/utils'

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

const strengthConfig = {
  0: { label: 'Too weak',  color: 'bg-destructive' },
  1: { label: 'Weak',      color: 'bg-warning' },
  2: { label: 'Good',      color: 'bg-primary-400' },
  3: { label: 'Strong',    color: 'bg-success' },
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null

  const strength = getPasswordStrength(password)
  const checks = getPasswordChecks(password)
  const { label, color } = strengthConfig[strength]

  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              i <= strength ? color : 'bg-border',
            )}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground w-16 text-right">{label}</span>
      </div>

      {/* Checklist */}
      <ul className="space-y-1">
        {checks.map(({ label, passed }) => (
          <li key={label} className="flex items-center gap-2 text-xs">
            <span className={cn('text-base leading-none', passed ? 'text-success' : 'text-border')}>
              {passed ? '✓' : '○'}
            </span>
            <span className={passed ? 'text-muted-foreground' : 'text-muted-foreground/60'}>
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
