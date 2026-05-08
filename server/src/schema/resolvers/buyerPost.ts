import { GraphQLError } from 'graphql'
import { eq, desc, and, gte, lte, type SQL } from 'drizzle-orm'
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

async function requireBuyerRole(ctx: Context, userId: string) {
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  })
  if (!user || (user.role !== 'buyer' && user.role !== 'both')) {
    throw new GraphQLError('Your account role does not allow posting criteria', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
}

export const buyerPostResolvers = {
  BuyerPost: {
    buyer: (post: BuyerPost, _: unknown, ctx: Context) =>
      ctx.loaders.user.load(post.buyerId),
    // Drizzle returns numeric as string — coerce for GraphQL Float
    priceMin: (post: BuyerPost) => Number(post.priceMin),
    priceMax: (post: BuyerPost) => Number(post.priceMax),
  },

  Query: {
    buyerPosts: (
      _: unknown,
      { limit = 20, offset = 0, filters }: {
        limit?: number
        offset?: number
        filters?: {
          propertyType?: string
          budgetMin?: number
          budgetMax?: number
          bedroomsMin?: number
          bathroomsMin?: number
          radiusKmMax?: number
        }
      },
      ctx: Context
    ) => {
      const conditions: SQL[] = [eq(buyerPosts.isActive, true)]

      if (filters) {
        if (filters.propertyType) conditions.push(eq(buyerPosts.propertyType, filters.propertyType as typeof buyerPosts.propertyType.enumValues[number]))
        // budgetMin: buyer's max budget must be >= this value
        if (filters.budgetMin != null) conditions.push(gte(buyerPosts.priceMax, String(filters.budgetMin)))
        // budgetMax: buyer's min budget must be <= this value
        if (filters.budgetMax != null) conditions.push(lte(buyerPosts.priceMin, String(filters.budgetMax)))
        if (filters.bedroomsMin != null) conditions.push(gte(buyerPosts.bedroomsMin, filters.bedroomsMin))
        if (filters.bathroomsMin != null) conditions.push(gte(buyerPosts.bathroomsMin, filters.bathroomsMin))
        if (filters.radiusKmMax != null) conditions.push(lte(buyerPosts.radiusKm, filters.radiusKmMax))
      }

      return ctx.db.query.buyerPosts.findMany({
        where: and(...conditions),
        orderBy: (bp) => desc(bp.createdAt),
        limit: Math.min(limit, MAX_PAGE_SIZE),
        offset,
      })
    },

    buyerPost: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      const post = await ctx.db.query.buyerPosts.findFirst({
        where: (bp, { eq }) => eq(bp.id, id),
      })
      if (post && !post.isActive && post.buyerId !== ctx.userId) return null
      return post ?? null
    },

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
      await requireBuyerRole(ctx, userId)
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
          yearBuiltMin: data.yearBuiltMin ?? null,
          conditions: data.conditions ?? null,
          floorMin: data.floorMin ?? null,
          floorMax: data.floorMax ?? null,
          requiresBalcony: data.requiresBalcony ?? null,
          requiresCentralHeating: data.requiresCentralHeating ?? null,
          requiredAmenities: data.requiredAmenities ?? [],
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
      if (data.yearBuiltMin !== undefined) updates.yearBuiltMin = data.yearBuiltMin
      if (data.conditions !== undefined) updates.conditions = data.conditions
      if (data.floorMin !== undefined) updates.floorMin = data.floorMin
      if (data.floorMax !== undefined) updates.floorMax = data.floorMax
      if (data.requiresBalcony !== undefined) updates.requiresBalcony = data.requiresBalcony
      if (data.requiresCentralHeating !== undefined) updates.requiresCentralHeating = data.requiresCentralHeating
      if (data.requiredAmenities !== undefined) updates.requiredAmenities = data.requiredAmenities

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
