import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '../../context.js'
import { userResolvers } from './user.js'

const owner = '123e4567-e89b-12d3-a456-426614174000'
const base = 'https://cdn.example.com'

afterEach(() => vi.unstubAllEnvs())

describe('profile image ownership', () => {
  it('rejects a newly supplied external avatar URL before updating the user', async () => {
    vi.stubEnv('R2_PUBLIC_URL', base)
    const update = vi.fn()
    const ctx = {
      userId: owner,
      db: {
        query: { users: { findFirst: vi.fn().mockResolvedValue({ id: owner, email: 'owner@example.com', avatarUrl: null, onboardingCompletedAt: new Date() }) } },
        update,
      },
    } as unknown as Context

    await expect(userResolvers.Mutation.upsertUser(null, {
      input: { avatarUrl: 'https://other.example.com/avatar.jpg' },
    }, ctx)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } })
    expect(update).not.toHaveBeenCalled()
  })

  it('allows a newly uploaded owned avatar and an unchanged legacy avatar', async () => {
    vi.stubEnv('R2_PUBLIC_URL', base)
    const legacy = 'https://lh3.googleusercontent.com/portrait'
    const owned = `${base}/avatars/${owner}/portrait.webp`
    const existing = { id: owner, email: 'owner@example.com', avatarUrl: legacy, onboardingCompletedAt: new Date() }
    const returning = vi.fn()
      .mockResolvedValueOnce([existing])
      .mockResolvedValueOnce([{ ...existing, avatarUrl: owned }])
    const update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning }) }) })
    const ctx = {
      userId: owner,
      db: { query: { users: { findFirst: vi.fn().mockResolvedValue(existing) } }, update },
    } as unknown as Context

    await expect(userResolvers.Mutation.upsertUser(null, { input: { avatarUrl: legacy } }, ctx)).resolves.toMatchObject({ avatarUrl: legacy })
    await expect(userResolvers.Mutation.upsertUser(null, { input: { avatarUrl: owned } }, ctx)).resolves.toMatchObject({ avatarUrl: owned })
    expect(update).toHaveBeenCalledTimes(2)
  })
})
