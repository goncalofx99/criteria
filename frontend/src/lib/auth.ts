// ─── Auth client ──────────────────────────────────────────────────────────────
// Manages access/refresh tokens and provides auth primitives for the app.
// Replaces @supabase/supabase-js auth.

const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  throw new Error('Missing VITE_API_URL environment variable')
}

// ─── Token storage ────────────────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = 'criteria_access_token'
const REFRESH_TOKEN_KEY = 'criteria_refresh_token'

let cachedAccessToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY)

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
  return cachedAccessToken
}

function setTokens(accessToken: string, refreshToken: string) {
  cachedAccessToken = accessToken
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  notifyListeners(accessToken)
}

function clearTokens() {
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
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) return null

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
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ─── Auth API calls ───────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  fullName: string | null
  role: string
  avatarUrl: string | null
}

interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export async function signUp(params: {
  email: string
  password: string
  fullName?: string
  avatarUrl?: string
  role?: 'buyer' | 'seller' | 'both'
}): Promise<AuthUser> {
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

export async function signOut(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
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
  const params = new URLSearchParams()
  if (redirectAfter) params.set('redirect', redirectAfter)
  const url = `${API_URL}/auth/google${params.toString() ? '?' + params.toString() : ''}`
  window.location.href = url
}

/**
 * Check if the user has a valid session (access token exists and refresh works).
 */
export async function hasValidSession(): Promise<boolean> {
  if (cachedAccessToken) return true
  const token = await refreshAccessToken()
  return token !== null
}

/**
 * Parse tokens from URL search params (used after Google OAuth callback).
 * Returns true if tokens were found and stored.
 */
export function handleOAuthCallback(): boolean {
  const params = new URLSearchParams(window.location.search)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (accessToken && refreshToken) {
    setTokens(accessToken, refreshToken)
    // Clean the URL
    window.history.replaceState({}, '', window.location.pathname)
    return true
  }
  return false
}
