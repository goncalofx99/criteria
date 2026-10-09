import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../lib/env.js', () => ({ env: { NODE_ENV: 'test' } }))

import { consumeAbuseBudget } from '../lib/abuseBudget.js'
import { sensitiveRateLimitMiddleware } from './rateLimit.js'

describe('targeted abuse limits', () => {
  it('blocks the sixth signup attempt from one address without blocking another', async () => {
    const app = new Hono()
    app.use('*', sensitiveRateLimitMiddleware)
    app.post('/auth/signup', (c) => c.json({ ok: true }))
    const attempt = (ip: string) => app.request('/auth/signup', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
    })

    for (let i = 0; i < 5; i++) expect((await attempt('192.0.2.10')).status).toBe(200)
    const blocked = await attempt('192.0.2.10')
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect((await attempt('192.0.2.11')).status).toBe(200)
  })

  it('resets a sender budget after its window', () => {
    const key = 'message:rate-limit-test-user'
    expect(consumeAbuseBudget(key, 2, 60_000, 1_000)).toBe(0)
    expect(consumeAbuseBudget(key, 2, 60_000, 2_000)).toBe(0)
    expect(consumeAbuseBudget(key, 2, 60_000, 3_000)).toBe(58)
    expect(consumeAbuseBudget(key, 2, 60_000, 61_000)).toBe(0)
  })

  it('uses the edge client address instead of a forged forwarded address', async () => {
    const app = new Hono()
    app.use('*', sensitiveRateLimitMiddleware)
    app.post('/auth/signup', (c) => c.json({ ok: true }))
    const attempt = (claimedIp: string) => app.request('/auth/signup', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '192.0.2.12', 'x-forwarded-for': `${claimedIp}, 192.0.2.12` },
    })

    for (let i = 0; i < 5; i++) expect((await attempt(`198.51.100.${i + 1}`)).status).toBe(200)
    expect((await attempt('198.51.100.99')).status).toBe(429)
  })
})
