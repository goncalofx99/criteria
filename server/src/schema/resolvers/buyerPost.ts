import { GraphQLError } from 'graphql'
import { eq, desc } from 'drizzle-orm'
import { buyerPosts, users } from '../../db/schema.js'
import type { Context } from '../../context.js'
import type { BuyerPost } from '../../db/schema.js'

type CreateBuyerPostInput = {
  title: string
  description?: string
  locationText: string
  lat: number
  lng: number
  radiusKm: number
  propertyType: 'apartment' | 'house' | 'land' | 'commercial'
  priceMin: number
  priceMax: number
  bedroomsMin: number
  bathroomsMin: number
  areaSqmMin?: number
}

type UpdateBuyerPostInput = Partial<CreateBuyerPostInput>

function requireAuth(ctx: Context) {
  if (!ctx.userId) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return ctx.userId
}

function requireOwnership(post: BuyerPost, userId: string) {
  if (post.buyerId !== userId) {
    throw new GraphQLError('Forbidden', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
}

export const buyerPostResolvers = {
  // Resolve nested buyer field from buyerId
  BuyerPost: {
    buyer: (post: BuyerPost, _: unknown, ctx: Context) =>
      ctx.db.query.users.findFirst({
        where: eq(users.id, post.buyerId),
      }),
    priceMin: (post: BuyerPost) => Number(post.priceMin),
    priceMax: (post: BuyerPost) => Number(post.priceMax),
  },

  Query: {
    buyerPosts: (_: unknown, { limit = 20, offset = 0 }: { limit?: number; offset?: number }, ctx: Context) =>
      ctx.db.query.buyerPosts.findMany({
        where: (bp, { eq }) => eq(bp.isActive, true),
        orderBy: (bp) => desc(bp.createdAt),
        limit,
        offset,
      }),

    buyerPost: (_: unknown, { id }: { id: string }, ctx: Context) =>
      ctx.db.query.buyerPosts.findFirst({
        where: (bp, { eq }) => eq(bp.id, id),
      }),

    myBuyerPosts: (_: unknown, __: unknown, ctx: Context) => {
      const userId = requireAuth(ctx)
      return ctx.db.query.buyerPosts.findMany({
        where: (bp, { eq }) => eq(bp.buyerId, userId),
        orderBy: (bp) => desc(bp.createdAt),
      })
    },
  },

  Mutation: {
    createBuyerPost: async (
      _: unknown,
      { input }: { input: CreateBuyerPostInput },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)

      const [post] = await ctx.db
        .insert(buyerPosts)
        .values({
          buyerId: userId,
          title: input.title,
          description: input.description ?? null,
          locationText: input.locationText,
          lat: input.lat,
          lng: input.lng,
          radiusKm: input.radiusKm,
          propertyType: input.propertyType,
          priceMin: String(input.priceMin),
          priceMax: String(input.priceMax),
          bedroomsMin: input.bedroomsMin,
          bathroomsMin: input.bathroomsMin,
          areaSqmMin: input.areaSqmMin ?? null,
        })
        .returning()

      return post
    },

    updateBuyerPost: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateBuyerPostInput },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)

      const existing = await ctx.db.query.buyerPosts.findFirst({
        where: (bp, { eq }) => eq(bp.id, id),
      })
      if (!existing) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } })
      requireOwnership(existing, userId)

      const updates: Partial<typeof buyerPosts.$inferInsert> = {
        updatedAt: new Date(),
      }
      if (input.title !== undefined) updates.title = input.title
      if (input.description !== undefined) updates.description = input.description
      if (input.locationText !== undefined) updates.locationText = input.locationText
      if (input.lat !== undefined) updates.lat = input.lat
      if (input.lng !== undefined) updates.lng = input.lng
      if (input.radiusKm !== undefined) updates.radiusKm = input.radiusKm
      if (input.propertyType !== undefined) updates.propertyType = input.propertyType
      if (input.priceMin !== undefined) updates.priceMin = String(input.priceMin)
      if (input.priceMax !== undefined) updates.priceMax = String(input.priceMax)
      if (input.bedroomsMin !== undefined) updates.bedroomsMin = input.bedroomsMin
      if (input.bathroomsMin !== undefined) updates.bathroomsMin = input.bathroomsMin
      if (input.areaSqmMin !== undefined) updates.areaSqmMin = input.areaSqmMin

      const [updated] = await ctx.db
        .update(buyerPosts)
        .set(updates)
        .where(eq(buyerPosts.id, id))
        .returning()

      return updated
    },

    deactivateBuyerPost: async (
      _: unknown,
      { id }: { id: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)

      const existing = await ctx.db.query.buyerPosts.findFirst({
        where: (bp, { eq }) => eq(bp.id, id),
      })
      if (!existing) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } })
      requireOwnership(existing, userId)

      const [updated] = await ctx.db
        .update(buyerPosts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(buyerPosts.id, id))
        .returning()

      return updated
    },
  },
}
