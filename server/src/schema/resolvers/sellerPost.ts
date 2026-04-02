import { GraphQLError } from 'graphql'
import { eq, desc, and } from 'drizzle-orm'
import { sellerPosts, users } from '../../db/schema.js'
import type { Context } from '../../context.js'
import type { SellerPost } from '../../db/schema.js'

type CreateSellerPostInput = {
  title: string
  description?: string
  locationText: string
  lat: number
  lng: number
  propertyType: 'apartment' | 'house' | 'land' | 'commercial'
  price: number
  bedrooms: number
  bathrooms: number
  areaSqm?: number
  images?: string[]
}

type UpdateSellerPostInput = Partial<CreateSellerPostInput>

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

export const sellerPostResolvers = {
  // Resolve nested seller field from sellerId
  SellerPost: {
    seller: (post: SellerPost, _: unknown, ctx: Context) =>
      ctx.db.query.users.findFirst({
        where: eq(users.id, post.sellerId),
      }),
    price: (post: SellerPost) => Number(post.price),
  },

  Query: {
    sellerPosts: (_: unknown, { limit = 20, offset = 0 }: { limit?: number; offset?: number }, ctx: Context) =>
      ctx.db.query.sellerPosts.findMany({
        where: (sp, { eq }) => eq(sp.isActive, true),
        orderBy: (sp) => desc(sp.createdAt),
        limit,
        offset,
      }),

    sellerPost: (_: unknown, { id }: { id: string }, ctx: Context) =>
      ctx.db.query.sellerPosts.findFirst({
        where: (sp, { eq }) => eq(sp.id, id),
      }),

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
      { input }: { input: CreateSellerPostInput },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)

      const [post] = await ctx.db
        .insert(sellerPosts)
        .values({
          sellerId: userId,
          title: input.title,
          description: input.description ?? null,
          locationText: input.locationText,
          lat: input.lat,
          lng: input.lng,
          propertyType: input.propertyType,
          price: String(input.price),
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          areaSqm: input.areaSqm ?? null,
          images: input.images ?? [],
        })
        .returning()

      return post
    },

    updateSellerPost: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateSellerPostInput },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)

      const existing = await ctx.db.query.sellerPosts.findFirst({
        where: (sp, { eq }) => eq(sp.id, id),
      })
      if (!existing) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } })
      requireOwnership(existing, userId)

      const updates: Partial<typeof sellerPosts.$inferInsert> = {
        updatedAt: new Date(),
      }
      if (input.title !== undefined) updates.title = input.title
      if (input.description !== undefined) updates.description = input.description
      if (input.locationText !== undefined) updates.locationText = input.locationText
      if (input.lat !== undefined) updates.lat = input.lat
      if (input.lng !== undefined) updates.lng = input.lng
      if (input.propertyType !== undefined) updates.propertyType = input.propertyType
      if (input.price !== undefined) updates.price = String(input.price)
      if (input.bedrooms !== undefined) updates.bedrooms = input.bedrooms
      if (input.bathrooms !== undefined) updates.bathrooms = input.bathrooms
      if (input.areaSqm !== undefined) updates.areaSqm = input.areaSqm
      if (input.images !== undefined) updates.images = input.images

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
