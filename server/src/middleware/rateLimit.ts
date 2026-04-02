import type { MiddlewareHandler } from 'hono'
import { env } from '../lib/env.js'

// In-memory rate limiter — good for single-instance MVP.
// Swap for Redis-backed rate limiting when scaling horizontally.
const requests = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = env.NODE_ENV === 'production' ? 60 : 500

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
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
