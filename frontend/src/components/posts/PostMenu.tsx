import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Pencil, Archive, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Compact "…" overflow menu for post detail pages.
 * Owner-only — pages must hide the menu when isOwner is false.
 *
 * The remove confirmation is rendered inline inside the menu sheet so users
 * don't lose context when they tap Remove.
 */
export function PostMenu({
  editTo,
  returnTo,
  onArchive,
  onReactivate,
  canReactivate = true,
  isActive,
  removeLabel = 'Archive',
  confirmTitle = 'Archive this post?',
  confirmBody = "It will be hidden from discovery. You can republish it later from your profile.",
}: {
  editTo: string
  returnTo: string
  onArchive: () => Promise<void>
  onReactivate: () => Promise<void>
  canReactivate?: boolean
  isActive: boolean
  removeLabel?: string
  confirmTitle?: string
  confirmBody?: string
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  function closeMenu(restoreFocus = false) {
    setOpen(false)
    setConfirming(false)
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    if (!open) return
    if (confirming) cancelRef.current?.focus()
    else menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')?.focus()
  }, [open, confirming])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeMenu()
      }
    }
    document.addEventListener('mousedown', onClick)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(true) }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Tab' && !confirming) {
      // Let the browser move focus, then dismiss the menu it just left.
      requestAnimationFrame(() => closeMenu())
      return
    }
    if (confirming) return
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])'))
    if (items.length === 0) return
    const index = items.findIndex(item => item === document.activeElement)
    let next = index
    if (event.key === 'ArrowDown') next = (index + 1) % items.length
    else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    event.preventDefault()
    items[next]?.focus()
  }

  async function run(action: () => Promise<void>) {
    setWorking(true)
    setError(null)
    try {
      await action()
      closeMenu(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this post. Try again.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="relative" ref={ref} onBlur={event => {
      if (open && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) closeMenu()
    }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup={confirming ? 'dialog' : 'menu'}
        aria-controls={open ? menuId : undefined}
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
          open ? 'bg-overlay text-foreground' : 'text-foreground/70 hover:bg-overlay',
        )}
        aria-label="More actions"
      >
        <MoreHorizontal size={20} />
      </button>

      {open && (
        <div
          id={menuId}
          ref={menuRef}
          className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-border bg-surface p-1 shadow-card"
          role={confirming ? 'dialog' : 'menu'}
          aria-label={confirming ? confirmTitle : 'Post actions'}
          onKeyDown={handleMenuKeyDown}
        >
          {error && <p role="alert" className="p-3 text-xs text-destructive">{error}</p>}
          {confirming ? (
            <div className="p-3">
              <p className="text-sm font-semibold text-foreground">{confirmTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{confirmBody}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  ref={cancelRef}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-lg"
                  onClick={() => setConfirming(false)}
                  disabled={working}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 rounded-lg"
                  onClick={() => void run(onArchive)}
                  disabled={working}
                >
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : removeLabel}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => { setOpen(false); navigate(editTo, { state: { returnTo } }) }}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-overlay"
              >
                <Pencil size={16} className="text-muted-foreground" />
                Edit
              </button>
              {isActive ? (
                <button type="button" role="menuitem" tabIndex={-1} onClick={() => setConfirming(true)} className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/5">
                  <Archive size={16} />{removeLabel}
                </button>
              ) : canReactivate ? (
                <button type="button" role="menuitem" tabIndex={-1} disabled={working} onClick={() => void run(onReactivate)} className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-primary hover:bg-accent disabled:opacity-50">
                  <RotateCcw size={16} />{working ? 'Republishing…' : 'Republish'}
                </button>
              ) : (
                <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setOpen(false); navigate('/profile') }} className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-primary hover:bg-accent">
                  Manage role to republish
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
