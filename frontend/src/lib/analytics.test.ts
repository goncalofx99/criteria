import { describe, expect, it } from 'vitest'
import { ANALYTICS_CONSENT_KEY, ANALYTICS_SESSION_DENIAL_KEY, getAnalyticsConsent, isAnalyticsSafePath, setAnalyticsConsent, webAnalyticsAvailable } from './analytics'

describe('optional analytics choice', () => {
  it('does not treat an absent or malformed choice as consent', () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null }
    expect(getAnalyticsConsent(storage)).toBeNull()
    values.set(ANALYTICS_CONSENT_KEY, 'yes')
    expect(getAnalyticsConsent(storage)).toBeNull()
  })

  it('records explicit opt-in and supports later withdrawal', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
    }
    expect(setAnalyticsConsent('granted', storage)).toBe(true)
    expect(getAnalyticsConsent(storage)).toBe('granted')
    expect(setAnalyticsConsent('denied', storage)).toBe(true)
    expect(getAnalyticsConsent(storage)).toBe('denied')
  })

  it('fails closed when the browser cannot save a choice', () => {
    const blocked = {
      getItem: () => { throw new Error('Storage blocked') },
      setItem: () => { throw new Error('Storage blocked') },
    }
    expect(setAnalyticsConsent('granted', blocked)).toBe(false)
    expect(getAnalyticsConsent(blocked)).toBeNull()
  })

  it('honors a session withdrawal if persistent storage becomes unwritable', () => {
    const persistent = {
      getItem: () => 'granted',
      setItem: () => { throw new Error('Storage blocked') },
    }
    const values = new Map<string, string>()
    const session = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
    }
    expect(setAnalyticsConsent('denied', persistent, session)).toBe(true)
    expect(values.get(ANALYTICS_SESSION_DENIAL_KEY)).toBe('denied')
    expect(getAnalyticsConsent(persistent, session)).toBe('denied')
    expect(setAnalyticsConsent('granted', persistent, session)).toBe(false)
  })

  it('limits the beacon to the production browser host', () => {
    expect(webAnalyticsAvailable('criteria-app.com', true, false, false, 'site-token')).toBe(true)
    expect(webAnalyticsAvailable('www.criteria-app.com', true, false, false, 'site-token')).toBe(true)
    expect(webAnalyticsAvailable('criteria-app.com', true, true, false, 'site-token')).toBe(false)
    expect(webAnalyticsAvailable('criteria-app.com', true, false, true, 'site-token')).toBe(false)
    expect(webAnalyticsAvailable('localhost', true, false, false, 'site-token')).toBe(false)
    expect(webAnalyticsAvailable('criteria-app.com', false, false, false, 'site-token')).toBe(false)
    expect(webAnalyticsAvailable('criteria-app.com', true, false, false, '')).toBe(false)
  })

  it('excludes single-use account links from third-party script loading', () => {
    expect(isAnalyticsSafePath('/')).toBe(true)
    expect(isAnalyticsSafePath('/feed')).toBe(true)
    expect(isAnalyticsSafePath('/auth/callback')).toBe(false)
    expect(isAnalyticsSafePath('/AUTH/CALLBACK/')).toBe(false)
    expect(isAnalyticsSafePath('/reset-password')).toBe(false)
    expect(isAnalyticsSafePath('/settings/verify-email')).toBe(false)
    expect(isAnalyticsSafePath('/settings/confirm-delete')).toBe(false)
  })
})
