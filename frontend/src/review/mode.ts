/**
 * Local, opt-in review mode. Vite replaces DEV at build time, so the production
 * bundle cannot enable this from a URL or a saved browser preference.
 */
export type ReviewRole = 'buyer' | 'seller' | 'both'
export type ReviewScenario = 'normal' | 'empty' | 'error' | 'slow' | 'onboarding' | 'signed-out'

const ENABLED_KEY = 'criteria_dev_review_enabled'
const ROLE_KEY = 'criteria_dev_review_role'
const SCENARIO_KEY = 'criteria_dev_review_scenario'
const GOOGLE_RESUME_KEY = 'criteria_dev_google_after_review'

export function resolveReviewMode(dev: boolean, search: string, stored: string | null): boolean {
  if (!dev) return false
  const flag = new URLSearchParams(search).get('review')
  if (flag === '1') return true
  if (flag === '0') return false
  return stored === '1'
}

function read(key: string): string | null {
  try { return sessionStorage.getItem(key) } catch { return null }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch { /* Private browsing can deny storage; the URL still opts in. */ }
}

export const reviewMode = import.meta.env.DEV && resolveReviewMode(
  true,
  typeof window === 'undefined' ? '' : window.location.search,
  typeof window === 'undefined' ? null : read(ENABLED_KEY),
)

if (reviewMode) write(ENABLED_KEY, '1')
else if (import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('review') === '0') {
  write(ENABLED_KEY, null)
}

export function getReviewRole(): ReviewRole {
  const role = read(ROLE_KEY)
  return role === 'buyer' || role === 'seller' || role === 'both' ? role : 'both'
}

export function getReviewScenario(): ReviewScenario {
  const scenario = read(SCENARIO_KEY)
  return scenario === 'empty' || scenario === 'error' || scenario === 'slow' || scenario === 'onboarding' || scenario === 'signed-out'
    ? scenario
    : 'normal'
}

export function setReviewSettings(role: ReviewRole, scenario: ReviewScenario) {
  if (!reviewMode) throw new Error('Review settings are available only in development review mode')
  write(ROLE_KEY, role)
  write(SCENARIO_KEY, scenario)
}

export function leaveReviewMode() {
  if (!import.meta.env.DEV) return
  write(ENABLED_KEY, null)
  write(ROLE_KEY, null)
  write(SCENARIO_KEY, null)
  const url = new URL(window.location.href)
  url.searchParams.set('review', '0')
  window.location.replace(url.toString())
}

/** A full reload is required before live OAuth: the review transport and
 * network guard are selected when the bundle first loads. */
export function continueWithLiveGoogleFromReview() {
  if (!reviewMode) return
  write(ENABLED_KEY, null)
  write(ROLE_KEY, null)
  write(SCENARIO_KEY, null)
  write(GOOGLE_RESUME_KEY, '1')
  window.location.replace(`${window.location.origin}/sign-in?review=0`)
}

export function takeLiveGoogleResume(): boolean {
  if (reviewMode) return false
  const shouldResume = read(GOOGLE_RESUME_KEY) === '1'
  write(GOOGLE_RESUME_KEY, null)
  return shouldResume
}
