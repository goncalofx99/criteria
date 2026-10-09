import { describe, expect, it } from 'vitest'
import { PRIVACY_NOTICE_KEY, hasSeenPrivacyNotice, markPrivacyNoticeSeen } from './privacy'

describe('privacy notice acknowledgement', () => {
  it('shows the notice until its current version has been acknowledged', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
    }
    expect(hasSeenPrivacyNotice(storage)).toBe(false)
    markPrivacyNoticeSeen(storage)
    expect(values.get(PRIVACY_NOTICE_KEY)).toBe('seen')
    expect(hasSeenPrivacyNotice(storage)).toBe(true)
  })

  it('still lets the user browse when storage is blocked', () => {
    const storage = {
      getItem: () => { throw new Error('Storage blocked') },
      setItem: () => { throw new Error('Storage blocked') },
    }
    expect(hasSeenPrivacyNotice(storage)).toBe(false)
    expect(() => markPrivacyNoticeSeen(storage)).not.toThrow()
  })
})
