import { ChevronDown, Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'
import { useLanguage } from '@/lib/language'

const LABEL: Record<ThemePreference, { pt: string; en: string }> = {
  light: { pt: 'Claro', en: 'Light' },
  dark: { pt: 'Escuro', en: 'Dark' },
  system: { pt: 'Sistema', en: 'System' },
}

/** Native select keeps every theme choice usable with touch, keyboard and AT. */
export function ThemeToggle({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { preference, setPreference } = useTheme()
  const { t } = useLanguage()
  const Icon = preference === 'system' ? Monitor : preference === 'dark' ? Moon : Sun

  return (
    <div
      className={cn(
        'relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded border border-border/80 bg-surface px-3 text-foreground transition-colors hover:bg-accent focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        compact ? 'w-11 px-0' : 'min-w-[108px]',
        className,
      )}
      title={`${t('Tema de cor', 'Color theme')}: ${t(LABEL[preference].pt, LABEL[preference].en)}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-primary-600" aria-hidden="true" />
      {!compact && <span className="text-xs font-semibold">{t(LABEL[preference].pt, LABEL[preference].en)}</span>}
      {!compact && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      <select
        aria-label={t('Tema de cor', 'Color theme')}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
        value={preference}
        onChange={event => setPreference(event.target.value as ThemePreference)}
      >
        <option value="system">{t('Sistema', 'System')}</option>
        <option value="light">{t('Claro', 'Light')}</option>
        <option value="dark">{t('Escuro', 'Dark')}</option>
      </select>
    </div>
  )
}
