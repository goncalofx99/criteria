import { describe, expect, it } from 'vitest'
import { NATIVE_OAUTH_CALLBACK, googleOAuthCallbackUrl, resolveOAuthRedirect } from './oauthRedirect.js'

describe('OAuth callback allowlist', () => {
  const frontendUrl = 'https://criteria-app.com'
  const webCallback = `${frontendUrl}/auth/callback`

  it('defaults to the configured web callback', () => {
    expect(resolveOAuthRedirect(frontendUrl)).toBe(webCallback)
  })

  it('allows only the exact configured web and native callbacks', () => {
    expect(resolveOAuthRedirect(frontendUrl, webCallback)).toBe(webCallback)
    expect(resolveOAuthRedirect(frontendUrl, NATIVE_OAUTH_CALLBACK)).toBe(NATIVE_OAUTH_CALLBACK)
    expect(resolveOAuthRedirect(frontendUrl, 'https://evil.example/collect')).toBeNull()
    expect(resolveOAuthRedirect(frontendUrl, `${webCallback}?next=https://evil.example`)).toBeNull()
    expect(resolveOAuthRedirect(frontendUrl, 'com.criteria.app://evil/callback')).toBeNull()
    expect(resolveOAuthRedirect(frontendUrl, 'https://criteria-app.com.evil.example/auth/callback')).toBeNull()
  })

  it('allows the equivalent loopback callback only when local aliases are enabled', () => {
    const local = 'http://localhost:5173'
    const alias = 'http://127.0.0.1:5173/auth/callback'
    expect(resolveOAuthRedirect(local, alias)).toBeNull()
    expect(resolveOAuthRedirect(local, alias, true)).toBe(alias)
    expect(resolveOAuthRedirect('http://127.0.0.1:5173', 'http://localhost:5173/auth/callback', true))
      .toBe('http://localhost:5173/auth/callback')
    expect(resolveOAuthRedirect(local, 'http://127.0.0.1:5174/auth/callback', true)).toBeNull()
    expect(resolveOAuthRedirect(local, 'http://127.0.0.1:5173/auth/callback?next=/', true)).toBeNull()
    expect(resolveOAuthRedirect(local, 'http://127.0.0.1:5173/other', true)).toBeNull()
    expect(resolveOAuthRedirect(local, 'http://127.0.0.2:5173/auth/callback', true)).toBeNull()
    expect(resolveOAuthRedirect(frontendUrl, alias, true)).toBeNull()
  })
})

describe('Google OAuth API callback', () => {
  it('uses localhost by default in development and the configured production origin', () => {
    expect(googleOAuthCallbackUrl(4000, false)).toBe('http://localhost:4000/auth/google/callback')
    expect(googleOAuthCallbackUrl(4000, true)).toBe('https://criteria-newn.onrender.com/auth/google/callback')
  })

  it('uses an explicit HTTPS API origin for device or tunnel testing', () => {
    expect(googleOAuthCallbackUrl(4000, false, 'https://api.example.com/'))
      .toBe('https://api.example.com/auth/google/callback')
  })
})
