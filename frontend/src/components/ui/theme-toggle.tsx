import { ChevronDown, Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'

const LABEL: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

/** Native select keeps every theme choice usable with touch, keyboard and AT. */
export function ThemeToggle({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { preference, setPreference } = useTheme()
  const Icon = preference === 'system' ? Monitor : preference === 'dark' ? Moon : Sun

  return (
    <div
      className={cn(
        'relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-border/80 bg-surface px-3 text-foreground transition-colors hover:bg-accent focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        compact ? 'w-11 px-0' : 'min-w-[108px]',
        className,
      )}
      title={`Color theme: ${LABEL[preference]}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-primary-600" aria-hidden="true" />
      {!compact && <span className="text-xs font-semibold">{LABEL[preference]}</span>}
      {!compact && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      <select
        aria-label="Color theme"
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
        value={preference}
        onChange={event => setPreference(event.target.value as ThemePreference)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  )
}
