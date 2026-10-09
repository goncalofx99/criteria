import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { ChevronDown, ShieldCheck, X } from 'lucide-react'
import { reviewMode } from '@/review/mode'
import {
  ANALYTICS_CONSENT_KEY,
  getAnalyticsConsent,
  setAnalyticsConsent,
  webAnalyticsAvailable,
  type AnalyticsConsent,
} from '@/lib/analytics'
import { OPEN_PRIVACY_EVENT, PRIVACY_NOTICE_KEY, hasSeenPrivacyNotice, markPrivacyNoticeSeen } from '@/lib/privacy'
import { AnalyticsBeacon } from './AnalyticsBeacon'
import { PrivacyInformation } from './PrivacyInformation'

/** Website notice. Optional analytics starts only after a recorded opt-in. */
export function PrivacyNotice() {
  const analyticsAvailable = typeof window !== 'undefined' && webAnalyticsAvailable(
    window.location.hostname, import.meta.env.PROD, Capacitor.isNativePlatform(), reviewMode,
  )
  const [choice, setChoice] = useState<AnalyticsConsent | null>(() => getAnalyticsConsent())
  const [open, setOpen] = useState(() => !hasSeenPrivacyNotice() || (analyticsAvailable && !getAnalyticsConsent()))
  const [expanded, setExpanded] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const reopen = () => {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setExpanded(true)
      setOpen(true)
      window.requestAnimationFrame(() => titleRef.current?.focus())
    }
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key === PRIVACY_NOTICE_KEY && event.newValue === 'seen') setOpen(false)
      if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) setChoice(getAnalyticsConsent())
    }
    window.addEventListener(OPEN_PRIVACY_EVENT, reopen)
    window.addEventListener('storage', syncFromAnotherTab)
    return () => {
      window.removeEventListener(OPEN_PRIVACY_EVENT, reopen)
      window.removeEventListener('storage', syncFromAnotherTab)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [open, analyticsAvailable, choice])

  function dismiss() {
    // Closing a first-run banner is an essential-only choice. It never starts
    // tracking. If storage is blocked, tracking stays off on future visits.
    if (analyticsAvailable && !choice) {
      if (setAnalyticsConsent('denied')) setChoice('denied')
    }
    markPrivacyNoticeSeen()
    setOpen(false)
    window.requestAnimationFrame(() => previousFocus.current?.focus())
  }

  function choose(next: AnalyticsConsent) {
    if (!setAnalyticsConsent(next)) {
      setStorageError(true)
      return
    }
    markPrivacyNoticeSeen()
    setChoice(next)
    setStorageError(false)
    setOpen(false)
    window.requestAnimationFrame(() => previousFocus.current?.focus())
  }

  return <>
    <AnalyticsBeacon />
    {open && <aside
      aria-labelledby="privacy-notice-title"
      aria-describedby="privacy-notice-summary"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] inset-x-3 z-[1500] max-h-[min(70dvh,700px)] overflow-y-auto rounded-2xl border border-border bg-surface p-5 text-foreground shadow-[0_24px_70px_-20px_rgba(13,38,26,.38)] sm:left-6 sm:right-auto sm:w-[min(440px,calc(100vw-3rem))] md:bottom-6"
    >
      <div className="flex items-start gap-3 pr-11">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary"><ShieldCheck size={20} aria-hidden="true" /></span>
        <div>
          <h2 id="privacy-notice-title" ref={titleRef} tabIndex={-1} className="text-base font-semibold outline-none">Privacy & browser storage</h2>
          <p id="privacy-notice-summary" className="mt-1 text-sm leading-relaxed text-muted-foreground">
            We store sign-in and display preferences in your browser. {analyticsAvailable
              ? 'You can choose whether to allow Cloudflare Web Analytics for page views and performance.'
              : 'Optional analytics is not configured on this website.'}
          </p>
        </div>
      </div>
      <button type="button" onClick={dismiss} aria-label="Close privacy notice" className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X size={18} aria-hidden="true" /></button>

      {analyticsAvailable && <p className="mt-4 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-foreground" role="status">Analytics: {choice === 'granted' ? 'Allowed' : choice === 'denied' ? 'Not allowed' : 'Not allowed until you choose'}. You can change this here later from Settings.</p>}
      <div id="privacy-notice-details" hidden={!expanded} className="mt-5 border-t border-border pt-4"><PrivacyInformation /><a href="/privacy" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline underline-offset-2">Read the full Privacy Policy</a></div>
      {storageError && <p role="alert" className="mt-3 text-sm text-destructive">{choice === 'granted'
        ? 'This browser could not save your withdrawal. Close this tab to stop analytics, clear this site’s data, and try again.'
        : 'This browser could not save your choice. Analytics remains off. Check your browser storage settings and try again.'}</p>}

      <div className="mt-5 border-t border-border pt-4">
        <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="privacy-notice-details" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {expanded ? 'Show less' : 'How it works'} <ChevronDown size={15} aria-hidden="true" className={expanded ? 'rotate-180' : ''} />
        </button>
        {analyticsAvailable ? <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => choose('denied')} aria-pressed={choice === 'denied'} className="min-h-11 rounded-xl border border-primary px-4 text-sm font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Essential only</button>
          <button type="button" onClick={() => choose('granted')} aria-pressed={choice === 'granted'} className="min-h-11 rounded-xl border border-primary px-4 text-sm font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Allow analytics</button>
        </div> : <div className="mt-2 flex justify-end">
          <button type="button" onClick={dismiss} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Got it</button>
        </div>}
      </div>
    </aside>}
  </>
}
