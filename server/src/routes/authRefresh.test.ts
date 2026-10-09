import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findSession: vi.fn(),
  findUser: vi.fn(),
  update: vi.fn(),
  deleteRows: vi.fn(),
}))
vi.mock('../db/index.js', () => ({ db: {
  query: {
    sessions: { findFirst: mocks.findSession },
    users: { findFirst: mocks.findUser },
  },
  update: mocks.update,
  delete: mocks.deleteRows,
} }))
vi.mock('../lib/env.js', () => ({ env: {
  JWT_SECRET: 'x'.repeat(32),
  FRONTEND_URL: 'https://criteria.example.test',
  NODE_ENV: 'test',
  PORT: 4000,
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  RESEND_API_KEY: 'test-mail-key',
  PASSWORD_RESET_FROM: 'security@example.test',
} }))

import { authRoutes } from './auth.js'
import { verifyJwt } from '../middleware/auth.js'

const userId = '123e4567-e89b-12d3-a456-426614174000'
const oldSession = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  userId,
  refreshToken: 'old-refresh-token',
  authVersion: 0,
  expiresAt: new Date(Date.now() + 60_000),
}

function refresh() {
  return authRoutes.request('http://localhost/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: oldSession.refreshToken }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.findSession.mockResolvedValue(oldSession)
  mocks.findUser.mockResolvedValue({ authVersion: 0 })
  mocks.deleteRows.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
})

describe('refresh revocation race', () => {
  it('rejects refresh when a password change deleted the row after lookup', async () => {
    mocks.update.mockReturnValue({
      set: () => ({ where: () => ({ returning: async () => [] }) }),
    })
    const response = await refresh()
    expect(response.status).toBe(401)
    expect(await response.json()).not.toHaveProperty('accessToken')
  })

  it('never upgrades a stale session token to the account’s newer auth version', async () => {
    mocks.update.mockReturnValue({
      set: () => ({ where: () => ({ returning: async () => [{
        ...oldSession,
        refreshToken: 'rotated-refresh-token',
      }] }) }),
    })
    // The account changes just after refresh checks its version. The minted
    // token retains version 0 and fails on the next verification.
    mocks.findUser.mockResolvedValueOnce({ authVersion: 0 }).mockResolvedValueOnce({ authVersion: 1 })
    const response = await refresh()
    expect(response.status).toBe(200)
    const body = await response.json() as { accessToken: string }
    // The old session may rotate immediately before revocation commits, but
    // the resulting access token still carries version 0 and is now invalid.
    expect(await verifyJwt(body.accessToken)).toBeNull()
  })

  it('rejects a session whose stored version is already revoked', async () => {
    mocks.update.mockReturnValue({
      set: () => ({ where: () => ({ returning: async () => [{ ...oldSession }] }) }),
    })
    mocks.findUser.mockResolvedValue({ authVersion: 1 })
    const response = await refresh()
    expect(response.status).toBe(401)
    expect(mocks.deleteRows).toHaveBeenCalled()
  })
})

describe('auth input bounds', () => {
  it('rejects oversized signup credentials before querying or hashing', async () => {
    const response = await authRoutes.request('http://localhost/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'person@example.com', password: 'x'.repeat(1025), age: 25 }),
    })
    expect(response.status).toBe(400)
    expect(mocks.findUser).not.toHaveBeenCalled()
  })

  it('rejects malformed recovery requests before querying accounts', async () => {
    const response = await authRoutes.request('http://localhost/auth/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-address' }),
    })
    expect(response.status).toBe(400)
    expect(mocks.findUser).not.toHaveBeenCalled()
  })
})
