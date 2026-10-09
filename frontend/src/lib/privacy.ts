/**
 * This is an acknowledgement of the storage explanation, not consent.
 * Optional Cloudflare analytics is separate and stays off unless configured
 * and explicitly allowed; the notice acknowledgement never grants consent.
 */
export const PRIVACY_NOTICE_KEY = 'criteria_privacy_notice_v1'
export const OPEN_PRIVACY_EVENT = 'criteria:open-privacy-information'

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try { return window.localStorage } catch { return null }
}

export function hasSeenPrivacyNotice(storage: Pick<Storage, 'getItem'> | null = browserStorage()): boolean {
  try { return storage?.getItem(PRIVACY_NOTICE_KEY) === 'seen' } catch { return false }
}

export function markPrivacyNoticeSeen(storage: Pick<Storage, 'setItem'> | null = browserStorage()): void {
  try { storage?.setItem(PRIVACY_NOTICE_KEY, 'seen') } catch { /* Browser storage can be unavailable. */ }
}

/** Open the explanation from Settings, including after the first notice was dismissed. */
export function openPrivacyPreferences(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_PRIVACY_EVENT))
}
