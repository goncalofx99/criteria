import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  current: number
  total: number
}

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1 rounded-full transition-all duration-300',
            i < current
              ? 'bg-primary'
              : i === current
                ? 'bg-primary w-5'
                : 'bg-border w-2',
            i < current ? 'w-2' : '',
          )}
        />
      ))}
    </div>
  )
}
