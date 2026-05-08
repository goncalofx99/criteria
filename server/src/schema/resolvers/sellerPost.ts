import { GraphQLError } from 'graphql'
import { eq, desc, and, gte, lte, inArray, arrayContains, type SQL } from 'drizzle-orm'
import { sellerPosts, users } from '../../db/schema.js'
import { validate, createSellerPostSchema, updateSellerPostSchema } from '../../lib/validate.js'
import type { Context } from '../../context.js'
import type { SellerPost } from '../../db/schema.js'

const MAX_PAGE_SIZE = 50

function requireAuth(ctx: Context) {
  if (!ctx.userId) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return ctx.userId
}

function requireOwnership(post: SellerPost, userId: string) {
  if (post.sellerId !== userId) {
    throw new GraphQLError('Forbidden', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
}

async function requireSellerRole(ctx: Context, userId: string) {
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  })
  if (!user || (user.role !== 'seller' && user.role !== 'both')) {
    throw new GraphQLError('Your account role does not allow creating property listings', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
}

export const sellerPostResolvers = {
  SellerPost: {
    seller: (post: SellerPost, _: unknown, ctx: Context) =>
      ctx.loaders.user.load(post.sellerId),
    // Drizzle returns numeric as string — coerce for GraphQL Float
    price: (post: SellerPost) => Number(post.price),
  },

  Query: {
    sellerPosts: (
      _: unknown,
      { limit = 20, offset = 0, filters }: {
        limit?: number
        offset?: number
        filters?: {
          propertyType?: string
          priceMin?: number
          priceMax?: number
          bedroomsMin?: number
          bathroomsMin?: number
          areaSqmMin?: number
          areaSqmMax?: number
          yearBuiltMin?: number
          condition?: string[]
          hasBalcony?: boolean
          hasCentralHeating?: boolean
          amenities?: string[]
        }
      },
      ctx: Context
    ) => {
      const conditions: SQL[] = [eq(sellerPosts.isActive, true)]

      if (filters) {
        if (filters.propertyType) conditions.push(eq(sellerPosts.propertyType, filters.propertyType as typeof sellerPosts.propertyType.enumValues[number]))
        if (filters.priceMin != null) conditions.push(gte(sellerPosts.price, String(filters.priceMin)))
        if (filters.priceMax != null) conditions.push(lte(sellerPosts.price, String(filters.priceMax)))
        if (filters.bedroomsMin != null) conditions.push(gte(sellerPosts.bedrooms, filters.bedroomsMin))
        if (filters.bathroomsMin != null) conditions.push(gte(sellerPosts.bathrooms, filters.bathroomsMin))
        if (filters.areaSqmMin != null) conditions.push(gte(sellerPosts.areaSqm, filters.areaSqmMin))
        if (filters.areaSqmMax != null) conditions.push(lte(sellerPosts.areaSqm, filters.areaSqmMax))
        if (filters.yearBuiltMin != null) conditions.push(gte(sellerPosts.yearBuilt, filters.yearBuiltMin))
        if (filters.condition?.length) conditions.push(inArray(sellerPosts.condition, filters.condition as (typeof sellerPosts.condition.enumValues[number])[]))
        if (filters.hasBalcony != null) conditions.push(eq(sellerPosts.hasBalcony, filters.hasBalcony))
        if (filters.hasCentralHeating != null) conditions.push(eq(sellerPosts.hasCentralHeating, filters.hasCentralHeating))
        if (filters.amenities?.length) conditions.push(arrayContains(sellerPosts.amenities, filters.amenities))
      }

      return ctx.db.query.sellerPosts.findMany({
        where: and(...conditions),
        orderBy: (sp) => desc(sp.createdAt),
        limit: Math.min(limit, MAX_PAGE_SIZE),
        offset,
      })
    },

    sellerPost: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      const post = await ctx.db.query.sellerPosts.findFirst({
        where: (sp, { eq }) => eq(sp.id, id),
      })
      // Hide inactive posts from non-owners
      if (post && !post.isActive && post.sellerId !== ctx.userId) return null
      return post ?? null
    },

    mySellerPosts: (_: unknown, __: unknown, ctx: Context) => {
      const userId = requireAuth(ctx)
      return ctx.db.query.sellerPosts.findMany({
        where: (sp, { eq }) => eq(sp.sellerId, userId),
        orderBy: (sp) => desc(sp.createdAt),
      })
    },
  },

  Mutation: {
    createSellerPost: async (
      _: unknown,
      { input }: { input: unknown },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)
      await requireSellerRole(ctx, userId)
      const data = validate(createSellerPostSchema, input)

      const [post] = await ctx.db
        .insert(sellerPosts)
        .values({
          sellerId: userId,
          title: data.title,
          description: data.description ?? null,
          locationText: data.locationText,
          lat: data.lat,
          lng: data.lng,
          propertyType: data.propertyType,
          price: String(data.price),
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          areaSqm: data.areaSqm,
          yearBuilt: data.yearBuilt,
          condition: data.condition,
          floor: data.floor ?? null,
          totalFloors: data.totalFloors ?? null,
          hasBalcony: data.hasBalcony,
          hasCentralHeating: data.hasCentralHeating,
          amenities: data.amenities ?? [],
          images: data.images ?? [],
        })
        .returning()

      return post
    },

    updateSellerPost: async (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)
      const data = validate(updateSellerPostSchema, input)

      const existing = await ctx.db.query.sellerPosts.findFirst({
        where: (sp, { eq }) => eq(sp.id, id),
      })
      if (!existing) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } })
      requireOwnership(existing, userId)

      const updates: Partial<typeof sellerPosts.$inferInsert> = { updatedAt: new Date() }
      if (data.title !== undefined) updates.title = data.title
      if (data.description !== undefined) updates.description = data.description
      if (data.locationText !== undefined) updates.locationText = data.locationText
      if (data.lat !== undefined) updates.lat = data.lat
      if (data.lng !== undefined) updates.lng = data.lng
      if (data.propertyType !== undefined) updates.propertyType = data.propertyType
      if (data.price !== undefined) updates.price = String(data.price)
      if (data.bedrooms !== undefined) updates.bedrooms = data.bedrooms
      if (data.bathrooms !== undefined) updates.bathrooms = data.bathrooms
      if (data.areaSqm !== undefined) updates.areaSqm = data.areaSqm
      if (data.yearBuilt !== undefined) updates.yearBuilt = data.yearBuilt
      if (data.condition !== undefined) updates.condition = data.condition
      if (data.floor !== undefined) updates.floor = data.floor
      if (data.totalFloors !== undefined) updates.totalFloors = data.totalFloors
      if (data.hasBalcony !== undefined) updates.hasBalcony = data.hasBalcony
      if (data.hasCentralHeating !== undefined) updates.hasCentralHeating = data.hasCentralHeating
      if (data.amenities !== undefined) updates.amenities = data.amenities
      if (data.images !== undefined) updates.images = data.images

      const [updated] = await ctx.db
        .update(sellerPosts)
        .set(updates)
        .where(eq(sellerPosts.id, id))
        .returning()

      return updated
    },

    deactivateSellerPost: async (
      _: unknown,
      { id }: { id: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)

      const existing = await ctx.db.query.sellerPosts.findFirst({
        where: (sp, { eq }) => eq(sp.id, id),
      })
      if (!existing) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } })
      requireOwnership(existing, userId)

      const [updated] = await ctx.db
        .update(sellerPosts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(sellerPosts.id, id))
        .returning()

      return updated
    },
  },
}
