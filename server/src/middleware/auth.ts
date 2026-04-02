import { createMiddleware } from 'hono/factory'
import { jwtVerify, createRemoteJWKSet } from 'jose'
import { env } from '../lib/env.js'

type Variables = { userId: string | null }

// ─── JWT key resolution ────────────────────────────────────────────────────────
//
// Supabase now signs tokens with an ECC P-256 key by default.
// We verify using the JWKS endpoint (/.well-known/jwks.json) which works with
// both the legacy HS256 secret AND the modern ECC key — whatever is active.
//
// The JWKS getter is lazy and cached after first call (jose handles this
// internally). The remote key set is refreshed automatically when key IDs rotate.
//
// SUPABASE_JWT_SECRET is kept as an optional override. When set it forces HS256
// verification (useful for local tests that don't connect to Supabase).

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(
      new URL(`${env.SUPABASE_URL}/.well-known/jwks.json`)
    )
  }
  return _jwks
}

// Shared JWT verification — used by both the HTTP middleware and the WS subscription context.
export async function verifyJwt(token: string): Promise<string | null> {
  try {
    // Split into two explicit branches so TypeScript can resolve the correct
    // jwtVerify overload (Uint8Array vs JWTVerifyGetKey are incompatible in a union).
    const { payload } = env.SUPABASE_JWT_SECRET
      ? await jwtVerify(token, new TextEncoder().encode(env.SUPABASE_JWT_SECRET))
      : await jwtVerify(token, getJwks())
    return (payload.sub as string) ?? null
  } catch {
    return null
  }
}

// Verifies the JWT on every request and sets userId in the Hono context.
// Resolvers are responsible for throwing if authentication is required.
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
