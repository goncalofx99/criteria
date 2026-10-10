import { Capacitor } from '@capacitor/core'
import { useLanguage } from '@/lib/language'
import { cn } from '@/lib/utils'

/** Desktop web control. Phone and native language preferences live in Settings. */
export function LanguageSwitcher({ className, variant = 'dark' }: { className?: string; variant?: 'light' | 'dark' }) {
  const { language, setLanguage, t } = useLanguage()
  if (Capacitor.isNativePlatform()) return null

  return (
    <div role="group" aria-label={t('Idioma', 'Language')} className={cn('hidden shrink-0 items-center rounded-sm border border-current/30 p-0.5 md:inline-flex', className)}>
      {(['pt', 'en'] as const).map(option => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          aria-pressed={language === option}
          aria-label={option === 'pt' ? t('Português', 'Portuguese') : t('Inglês', 'English')}
          lang={option === 'pt' ? 'pt-PT' : 'en-GB'}
          className={cn(
            'inline-flex min-h-11 min-w-11 items-center justify-center rounded-[2px] px-2 text-xs font-semibold tracking-[.04em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
            language === option
              ? variant === 'dark' ? 'bg-white text-primary-900' : 'bg-primary text-primary-foreground'
              : variant === 'dark' ? 'text-current opacity-80 hover:bg-white/10 hover:opacity-100' : 'text-current opacity-80 hover:bg-primary/10 hover:opacity-100',
          )}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
