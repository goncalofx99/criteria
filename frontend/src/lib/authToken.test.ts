import { describe, expect, it } from 'vitest'
import { tokenIsUsable } from './authToken'

const jwt = (exp: number) => `header.${btoa(JSON.stringify({ exp })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}.signature`

describe('access token expiry', () => {
  it('accepts only a JWT with more than 30 seconds remaining', () => {
    const now = 1_000_000
    expect(tokenIsUsable(jwt(1061), now)).toBe(true)
    expect(tokenIsUsable(jwt(1030), now)).toBe(false)
    expect(tokenIsUsable(jwt(900), now)).toBe(false)
  })

  it('rejects malformed or non-expiring tokens', () => {
    expect(tokenIsUsable('not-a-jwt')).toBe(false)
    expect(tokenIsUsable(`header.${btoa('{}')}.signature`)).toBe(false)
  })
})
