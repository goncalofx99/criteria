import { afterEach, describe, expect, it, vi } from 'vitest'
import { GraphQLError } from 'graphql'
import type { Context } from '../../context.js'
import { buyerPostResolvers } from './buyerPost.js'
import { conversationResolvers } from './conversation.js'
import { matchingResolvers } from './matching.js'
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

describe('public property discovery', () => {
  it('lets a guest browse active listings through the list query', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'post-1', isActive: true }])
    const ctx = { userId: null, db: { query: { sellerPosts: { findMany } } } } as unknown as Context

    await expect(sellerPostResolvers.Query.sellerPosts(null, { limit: 10, offset: 0 }, ctx))
      .resolves.toEqual([{ id: 'post-1', isActive: true }])
    expect(findMany).toHaveBeenCalledOnce()
    expect(findMany.mock.calls[0][0]).toMatchObject({ limit: 10, offset: 0 })
  })

  it('lets a guest search active listings with filters and pagination', async () => {
    const items = [{ id: 'post-1', isActive: true }]
    const findMany = vi.fn().mockResolvedValue(items)
    const where = vi.fn().mockResolvedValue([{ total: 3 }])
    const from = vi.fn().mockReturnValue({ where })
    const select = vi.fn().mockReturnValue({ from })
    const ctx = { userId: null, db: { query: { sellerPosts: { findMany } }, select } } as unknown as Context

    await expect(sellerPostResolvers.Query.sellerPostSearch(null, {
      limit: 1, offset: 0, filters: { priceMax: 300_000 }, search: 'Lisboa', sort: 'price_asc',
    }, ctx)).resolves.toEqual({ items, totalCount: 3, hasNextPage: true })
    expect(findMany).toHaveBeenCalledOnce()
    expect(findMany.mock.calls[0][0]).toMatchObject({ limit: 1, offset: 0 })
    expect(select).toHaveBeenCalledOnce()
    expect(where).toHaveBeenCalledOnce()
  })

  it('shows active details to guests but hides inactive posts from everyone except their owner', async () => {
    const findFirst = vi.fn().mockResolvedValueOnce({ id: 'post-1', sellerId: owner, isActive: true })
      .mockResolvedValueOnce({ id: 'post-2', sellerId: owner, isActive: false })
      .mockResolvedValueOnce({ id: 'post-2', sellerId: owner, isActive: false })
    const db = { query: { sellerPosts: { findFirst } } }
    const guest = { userId: null, db } as unknown as Context
    const ownerCtx = { userId: owner, db } as unknown as Context

    await expect(sellerPostResolvers.Query.sellerPost(null, { id: 'post-1' }, guest))
      .resolves.toMatchObject({ id: 'post-1' })
    await expect(sellerPostResolvers.Query.sellerPost(null, { id: 'post-2' }, guest)).resolves.toBeNull()
    await expect(sellerPostResolvers.Query.sellerPost(null, { id: 'post-2' }, ownerCtx))
      .resolves.toMatchObject({ id: 'post-2' })
  })

  it('still protects owner listings and mutations from guests', async () => {
    const findMany = vi.fn()
    const insert = vi.fn()
    const ctx = { userId: null, db: { query: { sellerPosts: { findMany } }, insert } } as unknown as Context

    expect(() => sellerPostResolvers.Query.mySellerPosts(null, null, ctx))
      .toThrowError(expect.objectContaining({ extensions: { code: 'UNAUTHENTICATED' } }))
    await expect(sellerPostResolvers.Mutation.createSellerPost(null, { input: {} }, ctx))
      .rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } })
    expect(findMany).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('keeps buyer requests, matching, and conversations private', async () => {
    const ctx = { userId: null, db: {} } as unknown as Context
    await expect(buyerPostResolvers.Query.buyerPosts(null, {}, ctx))
      .rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } })
    await expect(buyerPostResolvers.Query.buyerPostSearch(null, {}, ctx))
      .rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } })
    await expect(buyerPostResolvers.Query.buyerPost(null, { id: 'post-1' }, ctx))
      .rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } })
    await expect(matchingResolvers.Query.matchingBuyerPosts(null, { sellerPostId: 'post-1' }, ctx))
      .rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } })
    expect(() => conversationResolvers.Query.myConversations(null, null, ctx))
      .toThrowError(expect.objectContaining({ extensions: { code: 'UNAUTHENTICATED' } }))
    await expect(conversationResolvers.Query.conversation(null, { id: 'conversation-1' }, ctx))
      .rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } })
  })
})
