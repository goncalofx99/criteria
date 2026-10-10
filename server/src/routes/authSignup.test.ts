import { beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'crypto'

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  findPending: vi.fn(),
  deleteRows: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  hash: vi.fn(),
}))

vi.mock('../db/index.js', () => ({ db: {
  query: {
    users: { findFirst: mocks.findUser },
    pendingSignups: { findFirst: mocks.findPending },
  },
  delete: mocks.deleteRows,
  insert: mocks.insert,
  update: mocks.update,
  transaction: mocks.transaction,
} }))
vi.mock('../lib/env.js', () => ({ env: {
  JWT_SECRET: 'x'.repeat(32),
  FRONTEND_URL: 'https://criteria.example.test',
  PUBLIC_API_URL: 'https://api.criteria.example.test',
  NODE_ENV: 'test',
  PORT: 4000,
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  RESEND_API_KEY: 'test-mail-key',
  PASSWORD_RESET_FROM: 'security@example.test',
} }))
vi.mock('@node-rs/argon2', () => ({ hash: mocks.hash, verify: vi.fn() }))
vi.mock('../middleware/auth.js', () => ({ signAccessToken: vi.fn().mockResolvedValue('access-token') }))
vi.mock('arctic', () => ({
  generateState: () => 'test-oauth-state',
  generateCodeVerifier: () => 'test-code-verifier',
  Google: class {
    createAuthorizationURL() { return new URL('https://google.example.test/authorize') }
    async validateAuthorizationCode() { return { accessToken: () => 'google-token' } }
  },
}))

import { authRoutes } from './auth.js'

const userId = '123e4567-e89b-12d3-a456-426614174000'
const pending = {
  email: 'owner@example.test',
  fullName: 'Owner',
  role: 'buyer',
  passwordHash: 'hashed-password',
  tokenHash: 'stored-token-hash',
}
const user = {
  id: userId,
  email: pending.email,
  fullName: pending.fullName,
  role: pending.role,
  avatarUrl: null,
  authVersion: 0,
}
const clientVerifier = 'v'.repeat(43)
const clientChallenge = crypto.createHash('sha256').update(clientVerifier).digest('base64url')
const googleStartUrl = `http://localhost/auth/google?client_challenge=${clientChallenge}`

beforeEach(() => {
  vi.clearAllMocks()
  mocks.findUser.mockResolvedValue(null)
  mocks.findPending.mockResolvedValue(null)
  mocks.hash.mockResolvedValue(pending.passwordHash)
  mocks.deleteRows.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
})

describe('verified email registration', () => {
  it('emails a link without creating a user or session', async () => {
    mocks.insert.mockReturnValue({ values: () => ({
      onConflictDoNothing: () => ({ returning: async () => [pending] }),
    }) })

    const response = await authRoutes.request('http://localhost/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'OWNER@example.test', password: 'strong-password', age: 25, role: 'buyer' }),
    })

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ pendingVerification: true })
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    const emailRequest = vi.mocked(fetch).mock.calls[0][1]
    expect(String(emailRequest?.body)).toContain('https://criteria.example.test/verify-signup?token=')
  })

  it('creates an account only once after the link is redeemed', async () => {
    mocks.transaction.mockImplementationOnce(async (callback) => callback({
      delete: () => ({ where: () => ({ returning: async () => [pending] }) }),
      insert: () => ({ values: () => ({ onConflictDoNothing: () => ({ returning: async () => [user] }) }) }),
    })).mockResolvedValueOnce(null)
    mocks.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
    const request = () => authRoutes.request('http://localhost/auth/signup/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'x'.repeat(43) }),
    })

    const first = await request()
    expect(first.status).toBe(200)
    expect(await first.json()).toMatchObject({ accessToken: 'access-token', user: { id: userId } })
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    const second = await request()
    expect(second.status).toBe(400)
    expect(mocks.insert).toHaveBeenCalledTimes(1)
  })

  it('does not attach Google sign-in to an existing password account by email', async () => {
    mocks.findUser.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...user, passwordHash: pending.passwordHash, googleId: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'google-subject', email: pending.email, verified_email: true }),
    }))

    const start = await authRoutes.request(googleStartUrl)
    expect(start.status).toBe(302)
    const callback = await authRoutes.request('http://localhost/auth/google/callback?code=google-code&state=test-oauth-state')
    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe('https://criteria.example.test/sign-in?error=email_account_exists')
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('requires the initiating client verifier to redeem a Google exchange code', async () => {
    mocks.findUser.mockResolvedValue({ ...user, googleId: 'google-subject' })
    mocks.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'google-subject', email: pending.email, verified_email: true }),
    }))

    const start = await authRoutes.request(googleStartUrl)
    expect(start.status).toBe(302)
    const callback = await authRoutes.request('http://localhost/auth/google/callback?code=google-code&state=test-oauth-state')
    const code = new URL(callback.headers.get('location')!).searchParams.get('code')
    expect(code).toBeTruthy()

    const exchange = (verifier: string) => authRoutes.request('http://localhost/auth/google/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, clientVerifier: verifier }),
    })
    expect((await exchange('a'.repeat(43))).status).toBe(401)
    expect(mocks.insert).not.toHaveBeenCalled()
    expect((await exchange(clientVerifier)).status).toBe(401)

    await authRoutes.request(googleStartUrl)
    const secondCallback = await authRoutes.request('http://localhost/auth/google/callback?code=google-code&state=test-oauth-state')
    const secondCode = new URL(secondCallback.headers.get('location')!).searchParams.get('code')
    const valid = await authRoutes.request('http://localhost/auth/google/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: secondCode, clientVerifier }),
    })
    expect(valid.status).toBe(200)
    expect(await valid.json()).toMatchObject({ accessToken: 'access-token' })
    expect(mocks.insert).toHaveBeenCalledTimes(1)
  })
})
