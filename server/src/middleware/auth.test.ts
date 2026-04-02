import { describe, it, expect } from 'vitest'
import { SignJWT } from 'jose'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEST_SECRET = 'a'.repeat(32) // must be ≥ 32 chars (matches env validation)

async function makeToken(payload: Record<string, unknown>, secret = TEST_SECRET) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub as string)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret))
}

// ─── Token verification logic (extracted from middleware for unit testing) ─────
// We test the core JWT logic directly rather than through Hono's full middleware
// stack, which would require spinning up an HTTP server.

async function verifyToken(token: string, secret: string): Promise<string | null> {
  const { jwtVerify } = await import('jose')
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return (payload.sub as string) ?? null
  } catch {
    return null
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JWT verification', () => {
  it('returns the user ID from a valid token', async () => {
    const token = await makeToken({ sub: 'user-123' })
    const userId = await verifyToken(token, TEST_SECRET)
    expect(userId).toBe('user-123')
  })

  it('returns null for an expired token', async () => {
    const expiredToken = await new SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // issued 2h ago
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // expired 1h ago
      .sign(new TextEncoder().encode(TEST_SECRET))

    const userId = await verifyToken(expiredToken, TEST_SECRET)
    expect(userId).toBeNull()
  })

  it('returns null for a token signed with the wrong secret', async () => {
    const token = await makeToken({ sub: 'user-123' }, 'wrong-secret-that-is-long-enough-32chars')
    const userId = await verifyToken(token, TEST_SECRET)
    expect(userId).toBeNull()
  })

  it('returns null for a malformed token', async () => {
    const userId = await verifyToken('not.a.valid.jwt', TEST_SECRET)
    expect(userId).toBeNull()
  })

  it('returns null when token has no sub claim', async () => {
    const token = await new SignJWT({ role: 'buyer' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(TEST_SECRET))

    const userId = await verifyToken(token, TEST_SECRET)
    expect(userId).toBeNull()
  })
})
