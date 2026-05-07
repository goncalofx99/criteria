import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react'
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
  onDelete,
  isActive,
  removeLabel = 'Remove',
  confirmTitle = 'Remove this post?',
  confirmBody = "It'll be hidden from the feed. You can't undo this here.",
}: {
  editTo: string
  onDelete: () => Promise<void>
  isActive: boolean
  removeLabel?: string
  confirmTitle?: string
  confirmBody?: string
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirming(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
      setOpen(false)
      setConfirming(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
          open ? 'bg-overlay text-foreground' : 'text-foreground/70 hover:bg-overlay',
        )}
        aria-label="More actions"
      >
        <MoreHorizontal size={20} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-border bg-surface p-1 shadow-card"
        >
          {confirming ? (
            <div className="p-3">
              <p className="text-sm font-semibold text-foreground">{confirmTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{confirmBody}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-lg"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 rounded-lg"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : removeLabel}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setOpen(false); navigate(editTo) }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-overlay"
              >
                <Pencil size={16} className="text-muted-foreground" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={!isActive}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                {isActive ? removeLabel : 'Already removed'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
