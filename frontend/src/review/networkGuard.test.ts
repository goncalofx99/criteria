import { describe, expect, it } from 'vitest'
import { shouldBlockReviewRequest } from './networkGuard'

describe('review network guard', () => {
  const backend = [new URL('https://api.example.test/graphql'), new URL('https://api.example.test/auth')]

  it('blocks writes and configured backend reads while allowing tile reads', () => {
    expect(shouldBlockReviewRequest('POST', new URL('https://api.example.test/graphql'), backend)).toBe(true)
    expect(shouldBlockReviewRequest('PUT', new URL('https://uploads.example.test/file'), backend)).toBe(true)
    expect(shouldBlockReviewRequest('GET', new URL('https://api.example.test/graphql'), backend)).toBe(true)
    expect(shouldBlockReviewRequest('GET', new URL('https://tile.openstreetmap.org/1/1/1.png'), backend)).toBe(false)
  })
})
