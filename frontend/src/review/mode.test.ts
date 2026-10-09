import { describe, expect, it } from 'vitest'
import { resolveReviewMode } from './mode'

describe('review mode gate', () => {
  it('cannot activate in production, including with a saved opt-in', () => {
    expect(resolveReviewMode(false, '?review=1', '1')).toBe(false)
    expect(resolveReviewMode(false, '', '1')).toBe(false)
  })

  it('requires an explicit development opt-in and honors an explicit opt-out', () => {
    expect(resolveReviewMode(true, '', null)).toBe(false)
    expect(resolveReviewMode(true, '?review=1', null)).toBe(true)
    expect(resolveReviewMode(true, '', '1')).toBe(true)
    expect(resolveReviewMode(true, '?review=0', '1')).toBe(false)
  })
})
