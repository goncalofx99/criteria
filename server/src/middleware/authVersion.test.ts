import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignJWT } from 'jose'

const mocks = vi.hoisted(() => ({ findUser: vi.fn() }))
vi.mock('../db/index.js', () => ({ db: { query: { users: { findFirst: mocks.findUser } } } }))
vi.mock('../lib/env.js', () => ({ env: { JWT_SECRET: 'x'.repeat(32) } }))

import { verifyJwt } from './auth.js'

async function token(authVersion?: number) {
  return new SignJWT({ sub: 'owner-id', ...(authVersion === undefined ? {} : { authVersion }) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode('x'.repeat(32)))
}

beforeEach(() => vi.clearAllMocks())

describe('access-token invalidation', () => {
  it('accepts pre-migration tokens only while the account is at version zero', async () => {
    mocks.findUser.mockResolvedValue({ authVersion: 0 })
    const legacy = await token()
    expect(await verifyJwt(legacy)).toBe('owner-id')
    mocks.findUser.mockResolvedValue({ authVersion: 1 })
    expect(await verifyJwt(legacy)).toBeNull()
  })

  it('rejects access after the account version changes or the account is deleted', async () => {
    const issued = await token(2)
    mocks.findUser.mockResolvedValue({ authVersion: 2 })
    expect(await verifyJwt(issued)).toBe('owner-id')
    mocks.findUser.mockResolvedValue({ authVersion: 3 })
    expect(await verifyJwt(issued)).toBeNull()
    mocks.findUser.mockResolvedValue(null)
    expect(await verifyJwt(issued)).toBeNull()
  })
})
