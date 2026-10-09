// ─── Auth client ──────────────────────────────────────────────────────────────
// Manages access/refresh tokens and provides auth primitives for the app.
// Replaces @supabase/supabase-js auth.
import { reviewMode } from '@/review/mode'
import { getReviewStore, getReviewToken, setReviewAuthenticated } from '@/review/state'
import { tokenIsUsable } from './authToken'

const API_URL = import.meta.env.VITE_API_URL

if (!API_URL && !reviewMode) {
  throw new Error('Missing VITE_API_URL environment variable')
}

// ─── Token storage ────────────────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = 'criteria_access_token'
const REFRESH_TOKEN_KEY = 'criteria_refresh_token'

function stored(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

let cachedAccessToken: string | null = reviewMode ? null : stored(ACCESS_TOKEN_KEY)

type AuthListener = (token: string | null) => void
const listeners = new Set<AuthListener>()

function notifyListeners(token: string | null) {
  for (const fn of listeners) fn(token)
}

export function onAuthChange(fn: AuthListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getAccessToken(): string | null {
  if (reviewMode) return getReviewToken()
  if (!cachedAccessToken) return null
  return tokenIsUsable(cachedAccessToken) ? cachedAccessToken : null
}

export function setTokens(accessToken: string, refreshToken: string) {
  if (reviewMode) throw new Error('Live tokens cannot be set in review mode')
  if (!tokenIsUsable(accessToken) || !refreshToken) throw new Error('Invalid or expired session response')
  cachedAccessToken = accessToken
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  notifyListeners(accessToken)
}

function clearTokens() {
  if (reviewMode) {
    setReviewAuthenticated(false)
    notifyListeners(null)
    return
  }
  cachedAccessToken = null
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  notifyListeners(null)
}

// ─── Token refresh ────────────────────────────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new access token, or null if refresh failed.
 * Deduplicates concurrent calls.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (reviewMode) return getReviewToken()
  if (refreshPromise) return refreshPromise

  // Defer the body until the shared promise is assigned, including when no
  // refresh token exists. Otherwise an early return can leave a stale promise.
  refreshPromise = Promise.resolve().then(async () => {
    const refreshToken = stored(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      if (cachedAccessToken) clearTokens()
      return null
    }

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) {
        clearTokens()
        return null
      }

      const data = await res.json()
      setTokens(data.accessToken, data.refreshToken)
      return data.accessToken as string
    } catch {
      clearTokens()
      return null
    }
  }).finally(() => { refreshPromise = null })

  return refreshPromise
}

// ─── Auth API calls ───────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  fullName: string | null
  role: string
  avatarUrl: string | null
  onboardingComplete: boolean
}

interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

function reviewAuthUser(): AuthUser {
  const me = getReviewStore().me
  return { ...me, email: me.email ?? 'alex@example.test' }
}

export async function signUp(params: {
  email: string
  password: string
  age: number
  fullName?: string
  avatarUrl?: string
  role?: 'buyer' | 'seller' | 'both'
}): Promise<AuthUser> {
  if (reviewMode) {
    if (!Number.isInteger(params.age) || params.age < 18 || params.age > 120) throw new Error('Age must be between 18 and 120')
    const store = getReviewStore()
    store.me = {
      ...store.me,
      email: params.email,
      fullName: params.fullName ?? null,
      role: params.role ?? 'buyer',
      avatarUrl: params.avatarUrl ?? null,
      onboardingComplete: true,
      updatedAt: new Date().toISOString(),
    }
    setReviewAuthenticated(true)
    notifyListeners(getReviewToken())
    return reviewAuthUser()
  }
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Sign up failed')

  const { user, accessToken, refreshToken } = data as AuthResponse
  setTokens(accessToken, refreshToken)
  return user
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  if (reviewMode) {
    if (!email || !password) throw new Error('Enter an email and password')
    setReviewAuthenticated(true)
    notifyListeners(getReviewToken())
    return reviewAuthUser()
  }
  const res = await fetch(`${API_URL}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Sign in failed')

  const { user, accessToken, refreshToken } = data as AuthResponse
  setTokens(accessToken, refreshToken)
  return user
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (reviewMode) {
    if (!email.includes('@')) throw new Error('Enter a valid email address')
    return
  }
  const response = await fetch(`${API_URL}/auth/password-reset/request`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
  })
  const data = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(data.error || 'Could not request a password reset')
}

export async function confirmPasswordReset(token: string, password: string): Promise<void> {
  if (reviewMode) {
    if (!token || password.length < 8) throw new Error('Enter a valid reset link and password')
    return
  }
  const response = await fetch(`${API_URL}/auth/password-reset/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
  })
  const data = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(data.error || 'Password reset failed or expired')
}

export async function signOut(): Promise<void> {
  if (reviewMode) { clearTokens(); return }
  const refreshToken = stored(REFRESH_TOKEN_KEY)
  if (refreshToken) {
    await fetch(`${API_URL}/auth/signout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }
  clearTokens()
}

/**
 * Initiate Google OAuth flow.
 * Redirects the browser to the server's /auth/google endpoint.
 */
export function startGoogleOAuth(redirectAfter?: string) {
  if (reviewMode) throw new Error('Google OAuth is unavailable in local review mode. Use the role switcher or mock email sign-in.')
  const redirect = new URL(redirectAfter ?? '/auth/callback', window.location.origin)
  if (redirect.origin !== window.location.origin || redirect.pathname !== '/auth/callback') {
    throw new Error('Invalid Google sign-in return destination')
  }
  const params = new URLSearchParams()
  params.set('redirect', redirect.toString())
  const url = `${API_URL}/auth/google${params.toString() ? '?' + params.toString() : ''}`
  window.location.href = url
}

/**
 * Check if the user has a valid session (access token exists and refresh works).
 */
export async function hasValidSession(): Promise<boolean> {
  if (getAccessToken()) return true
  const token = await refreshAccessToken()
  return token !== null
}

/**
 * Parse tokens from URL search params (used after Google OAuth callback).
 * Returns true if tokens were found and stored.
 */
export async function completeGoogleOAuthCode(code: string): Promise<void> {
  if (reviewMode) throw new Error('Live OAuth is unavailable in review mode')
  if (!code) throw new Error('Missing Google sign-in code')
  const response = await fetch(`${API_URL}/auth/google/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const data = await response.json().catch(() => ({})) as { accessToken?: string; refreshToken?: string; error?: string }
  if (!response.ok || !data.accessToken || !data.refreshToken) {
    throw new Error(data.error || 'Google sign-in expired or failed. Please try again.')
  }
  setTokens(data.accessToken, data.refreshToken)
}

/** Exchange the single-use web OAuth code, removing it from browser history first. */
export async function handleOAuthCallback(): Promise<boolean> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  url.searchParams.delete('code')
  url.searchParams.delete('access_token')
  url.searchParams.delete('refresh_token')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  if (!code) return false
  await completeGoogleOAuthCode(code)
  return true
}
