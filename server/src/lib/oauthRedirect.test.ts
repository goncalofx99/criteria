import { describe, expect, it } from 'vitest'
import { NATIVE_OAUTH_CALLBACK, resolveOAuthRedirect } from './oauthRedirect.js'

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
})
