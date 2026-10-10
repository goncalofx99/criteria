import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'
import { mobileTabs } from './navigation'

function isEditingField(element: Element | null) {
  return element instanceof HTMLElement && element.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select, [contenteditable="true"]')
}

export function BottomNav() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let frame = 0
    const update = () => {
      setEditing(isEditingField(document.activeElement))
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    document.addEventListener('focusin', schedule)
    document.addEventListener('focusout', schedule)
    update()
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('focusin', schedule)
      document.removeEventListener('focusout', schedule)
    }
  }, [])

  useEffect(() => {
    // A route change can remove the focused field without firing focusout.
    const frame = requestAnimationFrame(() => setEditing(isEditingField(document.activeElement)))
    return () => cancelAnimationFrame(frame)
  }, [pathname])

  return (
    <nav
      aria-label={t('Navegação principal', 'Primary navigation')}
      className={cn('mobile-nav fixed bottom-0 left-0 right-0 z-50 justify-center border-t border-border bg-surface/95 backdrop-blur-xl md:hidden', editing ? 'hidden' : 'flex')}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid w-full max-w-app grid-cols-3 items-center px-2">
        {mobileTabs.map(({ to, icon: Icon, label, labelPt, primary }) => (
          <NavLink
            key={to}
            to={to}
            className="flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1 px-1 py-1 transition-colors hover:bg-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-accent/70"
          >
            {({ isActive }) => (
              <>
                <span className={cn(
                  'flex items-center justify-center rounded-sm transition-colors',
                  primary
                    ? 'h-10 w-10 bg-primary text-primary-foreground shadow-sm'
                    : 'h-9 w-11',
                  !primary && (isActive ? 'bg-primary-100 text-primary' : 'text-muted-foreground'),
                )}>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.3 : 1.8} aria-hidden="true" />
                </span>
                <span className={cn('text-xs leading-none', isActive || primary ? 'font-semibold text-primary' : 'text-muted-foreground')}>{t(labelPt, label)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
