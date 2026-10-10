import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { beginOAuthClientProof, takeOAuthClientVerifier } from './oauthClientProof'

const values = new Map<string, string>()

beforeEach(() => {
  values.clear()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('OAuth client proof', () => {
  it('stores a single-use verifier whose SHA-256 digest matches the challenge', async () => {
    const challenge = await beginOAuthClientProof()
    const verifier = takeOAuthClientVerifier()
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(createHash('sha256').update(verifier).digest('base64url')).toBe(challenge)
    expect(() => takeOAuthClientVerifier()).toThrow(/session was lost/)
  })

  it('fails closed when the verifier cannot be stored', async () => {
    vi.stubGlobal('sessionStorage', {
      setItem: () => { throw new Error('Storage blocked') },
    })
    await expect(beginOAuthClientProof()).rejects.toThrow('Storage blocked')
  })
})
