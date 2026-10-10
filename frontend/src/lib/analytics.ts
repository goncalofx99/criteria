/**
 * Cloudflare Web Analytics is optional. The Vite site token is public site
 * configuration, not a credential. Never load the beacon before opt-in.
 */
export const ANALYTICS_CONSENT_KEY = 'criteria_analytics_consent_v1'
export const ANALYTICS_SESSION_DENIAL_KEY = 'criteria_analytics_session_denied_v1'
export const ANALYTICS_CONSENT_EVENT = 'criteria:analytics-consent-changed'
export const CLOUDFLARE_WEB_ANALYTICS_TOKEN = import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim() ?? ''

export type AnalyticsConsent = 'granted' | 'denied'

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try { return window.localStorage } catch { return null }
}

function browserSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try { return window.sessionStorage } catch { return null }
}

export function getAnalyticsConsent(
  storage: Pick<Storage, 'getItem'> | null = browserStorage(),
  session: Pick<Storage, 'getItem'> | null = browserSessionStorage(),
): AnalyticsConsent | null {
  // A withdrawal must take effect in this tab even if persistent storage has
  // become unwritable since an earlier opt-in.
  try { if (session?.getItem(ANALYTICS_SESSION_DENIAL_KEY) === 'denied') return 'denied' } catch { /* use persistent choice */ }
  try {
    const saved = storage?.getItem(ANALYTICS_CONSENT_KEY)
    return saved === 'granted' || saved === 'denied' ? saved : null
  } catch { return null }
}

export function setAnalyticsConsent(
  choice: AnalyticsConsent,
  storage: Pick<Storage, 'setItem'> | null = browserStorage(),
  session: Pick<Storage, 'setItem' | 'removeItem'> | null = browserSessionStorage(),
): boolean {
  if (choice === 'granted') {
    if (!storage) return false
    try {
      storage.setItem(ANALYTICS_CONSENT_KEY, choice)
      session?.removeItem(ANALYTICS_SESSION_DENIAL_KEY)
    } catch { return false }
  } else {
    let saved = false
    try {
      storage?.setItem(ANALYTICS_CONSENT_KEY, choice)
      saved = Boolean(storage)
    } catch { /* try a session-only withdrawal */ }
    if (!saved) {
      try {
        session?.setItem(ANALYTICS_SESSION_DENIAL_KEY, choice)
        saved = Boolean(session)
      } catch { return false }
    }
    if (!saved) return false
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT))
  return true
}

/** Only the real browser site is eligible, never native, preview, or review mode. */
export function webAnalyticsAvailable(hostname: string, production: boolean, native: boolean, review: boolean, token = CLOUDFLARE_WEB_ANALYTICS_TOKEN): boolean {
  return Boolean(token.trim()) && production && !native && !review &&
    (hostname === 'criteria-app.com' || hostname === 'www.criteria-app.com')
}

/** Never initialize third-party JavaScript on single-use token landing pages. */
export function isAnalyticsSafePath(pathname: string): boolean {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/'
  return !path.startsWith('/auth/') &&
    path !== '/reset-password' &&
    path !== '/verify-signup' &&
    path !== '/settings/verify-email' &&
    path !== '/settings/confirm-delete'
}
