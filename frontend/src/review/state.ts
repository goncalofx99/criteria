import { makeReviewStore, type ReviewStore } from './fixtures'
import { getReviewRole, getReviewScenario } from './mode'

let store: ReviewStore | null = null
let authenticated: boolean | null = null

export function getReviewStore(): ReviewStore {
  if (!store) {
    store = makeReviewStore(getReviewRole())
    if (getReviewScenario() === 'onboarding') store.me.onboardingComplete = false
  }
  return store
}

export function getReviewToken(): string | null {
  if (authenticated === null) authenticated = getReviewScenario() !== 'signed-out'
  return authenticated ? 'local-review-session' : null
}

export function setReviewAuthenticated(value: boolean) {
  authenticated = value
}
