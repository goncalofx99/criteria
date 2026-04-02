import { GraphQLError } from 'graphql'
import { eq, desc } from 'drizzle-orm'
import { buyerPosts, users } from '../../db/schema.js'
import { validate, createBuyerPostSchema, updateBuyerPostSchema } from '../../lib/validate.js'
import type { Context } from '../../context.js'
import type { BuyerPost } from '../../db/schema.js'

const MAX_PAGE_SIZE = 50

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
  BuyerPost: {
    buyer: (post: BuyerPost, _: unknown, ctx: Context) =>
      ctx.db.query.users.findFirst({
        where: eq(users.id, post.buyerId),
      }),
    // Drizzle returns numeric as string — coerce for GraphQL Float
    priceMin: (post: BuyerPost) => Number(post.priceMin),
    priceMax: (post: BuyerPost) => Number(post.priceMax),
  },

  Query: {
    buyerPosts: (
      _: unknown,
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      ctx: Context
    ) =>
      ctx.db.query.buyerPosts.findMany({
        where: (bp, { eq }) => eq(bp.isActive, true),
        orderBy: (bp) => desc(bp.createdAt),
        limit: Math.min(limit, MAX_PAGE_SIZE),
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
      { input }: { input: unknown },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)
      const data = validate(createBuyerPostSchema, input)

      const [post] = await ctx.db
        .insert(buyerPosts)
        .values({
          buyerId: userId,
          title: data.title,
          description: data.description ?? null,
          locationText: data.locationText,
          lat: data.lat,
          lng: data.lng,
          radiusKm: data.radiusKm,
          propertyType: data.propertyType,
          priceMin: String(data.priceMin),
          priceMax: String(data.priceMax),
          bedroomsMin: data.bedroomsMin,
          bathroomsMin: data.bathroomsMin,
          areaSqmMin: data.areaSqmMin ?? null,
        })
        .returning()

      return post
    },

    updateBuyerPost: async (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)
      const data = validate(updateBuyerPostSchema, input)

      const existing = await ctx.db.query.buyerPosts.findFirst({
        where: (bp, { eq }) => eq(bp.id, id),
      })
      if (!existing) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } })
      requireOwnership(existing, userId)

      const updates: Partial<typeof buyerPosts.$inferInsert> = { updatedAt: new Date() }
      if (data.title !== undefined) updates.title = data.title
      if (data.description !== undefined) updates.description = data.description
      if (data.locationText !== undefined) updates.locationText = data.locationText
      if (data.lat !== undefined) updates.lat = data.lat
      if (data.lng !== undefined) updates.lng = data.lng
      if (data.radiusKm !== undefined) updates.radiusKm = data.radiusKm
      if (data.propertyType !== undefined) updates.propertyType = data.propertyType
      if (data.priceMin !== undefined) updates.priceMin = String(data.priceMin)
      if (data.priceMax !== undefined) updates.priceMax = String(data.priceMax)
      if (data.bedroomsMin !== undefined) updates.bedroomsMin = data.bedroomsMin
      if (data.bathroomsMin !== undefined) updates.bathroomsMin = data.bathroomsMin
      if (data.areaSqmMin !== undefined) updates.areaSqmMin = data.areaSqmMin

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
