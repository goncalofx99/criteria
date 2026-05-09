import { createMiddleware } from 'hono/factory'
import { jwtVerify, SignJWT } from 'jose'
import { env } from '../lib/env.js'

type Variables = { userId: string | null }

// ─── JWT helpers ──────────────────────────────────────────────────────────────

const secret = new TextEncoder().encode(env.JWT_SECRET)

/**
 * Sign a short-lived access token (15 minutes).
 */
export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret)
}

/**
 * Verify an access token and return the user ID, or null if invalid/expired.
 */
export async function verifyJwt(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if (typeof payload.sub !== 'string') return null
    return payload.sub
  } catch {
    return null
  }
}

// ─── Hono middleware ──────────────────────────────────────────────────────────

/**
 * Sets `userId` on Hono context from the Authorization header.
 * Never rejects — resolvers call requireAuth() themselves.
 */
export const authMiddleware = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      c.set('userId', null)
      return next()
    }

    c.set('userId', await verifyJwt(authHeader.slice(7)))
    return next()
  }
)
