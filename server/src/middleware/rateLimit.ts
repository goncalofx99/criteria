import type { MiddlewareHandler } from 'hono'
import { isIP } from 'node:net'
import { env } from '../lib/env.js'
import { consumeAbuseBudget } from '../lib/abuseBudget.js'

// In-memory rate limiter — good for single-instance MVP.
// Swap for Redis-backed rate limiting when scaling horizontally.
const requests = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = env.NODE_ENV === 'production' ? 60 : 500

function getClientIp(req: Request): string {
  // Render's Cloudflare edge overwrites this header. The leftmost
  // X-Forwarded-For address can be supplied by the caller and is not trusted.
  const edgeIp = req.headers.get('cf-connecting-ip')?.trim()
  if (edgeIp && isIP(edgeIp)) return edgeIp
  const forwarded = req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
  if (forwarded && isIP(forwarded)) return forwarded
  return 'unknown'
}

const sensitiveLimits: Record<string, { max: number; windowMs: number }> = {
  '/auth/signup': { max: 5, windowMs: 60 * 60_000 },
  '/auth/signin': { max: 30, windowMs: 10 * 60_000 },
  '/auth/password-reset/request': { max: 5, windowMs: 60 * 60_000 },
}

export const sensitiveRateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  if (c.req.method !== 'POST') return next()
  const rule = sensitiveLimits[c.req.path]
  if (!rule) return next()
  const retryAfter = consumeAbuseBudget(`${c.req.path}:${getClientIp(c.req.raw)}`, rule.max, rule.windowMs)
  if (retryAfter > 0) {
    c.header('Retry-After', String(retryAfter))
    return c.json({ error: 'Too many attempts. Please try again later.' }, 429)
  }
  return next()
}

export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  const ip = getClientIp(c.req.raw)
  const now = Date.now()

  const entry = requests.get(ip)

  if (!entry || now > entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return next()
  }

  if (entry.count >= MAX_REQUESTS) {
    return c.json(
      { errors: [{ message: 'Too many requests — try again in a minute.' }] },
      429
    )
  }

  entry.count++
  return next()
}

// Periodically clear expired entries so the map doesn't grow unboundedly.
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of requests) {
    if (now > entry.resetAt) requests.delete(ip)
  }
}, WINDOW_MS)
