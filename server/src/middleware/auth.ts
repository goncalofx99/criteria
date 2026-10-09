import { createMiddleware } from 'hono/factory'
import { jwtVerify, SignJWT } from 'jose'
import { eq } from 'drizzle-orm'
import { env } from '../lib/env.js'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'

type Variables = { userId: string | null }

// ─── JWT helpers ──────────────────────────────────────────────────────────────

const secret = new TextEncoder().encode(env.JWT_SECRET)

/**
 * Sign a short-lived access token (15 minutes).
 */
export async function signAccessToken(userId: string, authVersion: number): Promise<string> {
  return new SignJWT({ sub: userId, authVersion })
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
    // Legacy access tokens minted before this column was added have version 0.
    // Checking the DB also makes account deletion invalidate access immediately.
    const user = await db.query.users.findFirst({
      columns: { authVersion: true },
      where: eq(users.id, payload.sub),
    })
    if (!user || user.authVersion !== (payload.authVersion ?? 0)) return null
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
