import { afterEach, describe, expect, it, vi } from 'vitest'
import { GraphQLError } from 'graphql'
import type { Context } from '../../context.js'
import { sellerPostResolvers } from './sellerPost.js'

const owner = '123e4567-e89b-12d3-a456-426614174000'
const other = '123e4567-e89b-12d3-a456-426614174001'
const base = 'https://cdn.example.com'

afterEach(() => vi.unstubAllEnvs())

describe('listing image ownership', () => {
  it('rejects an external image before creating a post', async () => {
    vi.stubEnv('R2_PUBLIC_URL', base)
    const insert = vi.fn()
    const ctx = {
      userId: owner,
      db: { query: { users: { findFirst: vi.fn().mockResolvedValue({ role: 'seller', onboardingCompletedAt: new Date() }) } }, insert },
    } as unknown as Context

    const create = sellerPostResolvers.Mutation.createSellerPost(null, {
      input: {
        title: 'Plot', locationText: 'Lagos, Faro, Portugal', lat: 37.103, lng: -8.675,
        propertyType: 'land', price: 80_000, images: ['https://other.example.com/photo.jpg'],
      },
    }, ctx)

    await expect(create).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } } satisfies Partial<GraphQLError>)
    expect(insert).not.toHaveBeenCalled()
  })

  it('rejects another owner’s image before updating a post', async () => {
    vi.stubEnv('R2_PUBLIC_URL', base)
    const update = vi.fn()
    const ctx = {
      userId: owner,
      db: {
        query: { sellerPosts: { findFirst: vi.fn().mockResolvedValue({ id: 'post-1', sellerId: owner, propertyType: 'land' }) } },
        update,
      },
    } as unknown as Context

    const edit = sellerPostResolvers.Mutation.updateSellerPost(null, {
      id: 'post-1', input: { images: [`${base}/posts/${other}/photo.jpg`] },
    }, ctx)

    await expect(edit).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } } satisfies Partial<GraphQLError>)
    expect(update).not.toHaveBeenCalled()
  })

  it('allows an unchanged legacy image while accepting a newly uploaded owned image', async () => {
    vi.stubEnv('R2_PUBLIC_URL', base)
    const legacy = 'https://legacy.example.com/old-photo.jpg'
    const owned = `${base}/posts/${owner}/new-photo.webp`
    const existing = { id: 'post-1', sellerId: owner, propertyType: 'land', images: [legacy] }
    const returning = vi.fn().mockResolvedValue([{ ...existing, images: [legacy, owned] }])
    const update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning }) }) })
    const ctx = {
      userId: owner,
      db: { query: { sellerPosts: { findFirst: vi.fn().mockResolvedValue(existing) } }, update },
    } as unknown as Context

    await expect(sellerPostResolvers.Mutation.updateSellerPost(null, {
      id: 'post-1', input: { images: [legacy, owned] },
    }, ctx)).resolves.toMatchObject({ images: [legacy, owned] })
    expect(update).toHaveBeenCalledOnce()
  })
})
