import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'

interface StepIndicatorProps {
  current: number
  total: number
}

export function StepIndicator({ current, total }: StepIndicatorProps) {
  const { t } = useLanguage()
  const stepLabel = t(`Passo ${current + 1} de ${total}`, `Step ${current + 1} of ${total}`)
  return (
    <div className="flex flex-col items-center gap-1.5" role="progressbar" aria-label={t('Configuração da conta', 'Account setup')} aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1} aria-valuetext={stepLabel}>
      <span className="text-xs font-semibold text-muted-foreground">{stepLabel}</span>
      <div className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={cn('h-0.5 w-6 transition-colors duration-150', i <= current ? 'bg-primary' : 'bg-border')} />
        ))}
      </div>
    </div>
  )
}
