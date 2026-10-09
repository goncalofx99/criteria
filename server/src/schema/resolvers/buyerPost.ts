import { GraphQLError } from 'graphql'
import { eq, desc, asc, and, or, gte, lte, count, type SQL } from 'drizzle-orm'
import { buyerPosts, users } from '../../db/schema.js'
import { validate, createBuyerPostSchema, updateBuyerPostSchema } from '../../lib/validate.js'
import type { Context } from '../../context.js'
import type { BuyerPost } from '../../db/schema.js'
import { assertFilterRange, boundsCondition, publicLocalitySearchCondition, publicMapCoordinate, searchPage, textCondition, type MapBounds } from '../../lib/search.js'
import { publicCoordinate, publicLocationText } from '../../lib/publicLocation.js'

const MAX_PAGE_SIZE = 200

type BuyerFilters = {
  propertyType?: string; budgetMin?: number; budgetMax?: number;
  bedroomsMin?: number; bathroomsMin?: number; radiusKmMax?: number
}
type BuyerSort = 'newest' | 'oldest' | 'budget_asc' | 'budget_desc'

export function buyerWhere(filters?: BuyerFilters | null, search?: string | null, bounds?: MapBounds | null) {
  const conditions: SQL[] = [eq(buyerPosts.isActive, true)]
  if (filters) {
    assertFilterRange(filters.budgetMin, filters.budgetMax, 'budget')
    assertFilterRange(filters.bedroomsMin, undefined, 'bedrooms')
    assertFilterRange(filters.bathroomsMin, undefined, 'bathrooms')
    assertFilterRange(filters.radiusKmMax, undefined, 'radius')
    if (filters.propertyType) conditions.push(eq(buyerPosts.propertyType, filters.propertyType as typeof buyerPosts.propertyType.enumValues[number]))
    if (filters.budgetMin != null) conditions.push(gte(buyerPosts.priceMax, String(filters.budgetMin)))
    if (filters.budgetMax != null) conditions.push(lte(buyerPosts.priceMin, String(filters.budgetMax)))
    if (filters.bedroomsMin != null) conditions.push(gte(buyerPosts.bedroomsMin, filters.bedroomsMin))
    if (filters.bathroomsMin != null) conditions.push(gte(buyerPosts.bathroomsMin, filters.bathroomsMin))
    if (filters.radiusKmMax != null) conditions.push(lte(buyerPosts.radiusKm, filters.radiusKmMax))
  }
  const text = textCondition(search, buyerPosts.title, buyerPosts.description)
  const locality = publicLocalitySearchCondition(search, buyerPosts.locationText)
  if (text) conditions.push(locality ? or(text, locality)! : text)
  const location = boundsCondition(bounds, publicMapCoordinate(buyerPosts.lat), publicMapCoordinate(buyerPosts.lng))
  if (location) conditions.push(location)
  return and(...conditions)!
}

function buyerOrder(sort: BuyerSort = 'newest'): SQL[] {
  const first: SQL = {
    newest: desc(buyerPosts.createdAt), oldest: asc(buyerPosts.createdAt),
    budget_asc: asc(buyerPosts.priceMax), budget_desc: desc(buyerPosts.priceMax),
  }[sort] ?? desc(buyerPosts.createdAt)
  return [first, desc(buyerPosts.createdAt), desc(buyerPosts.id)]
}

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
    columns: { role: true, onboardingCompletedAt: true },
  })
  if (!user || !user.onboardingCompletedAt || (user.role !== 'buyer' && user.role !== 'both')) {
    throw new GraphQLError('Your account role does not allow posting criteria', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
}

async function requireSellerView(ctx: Context) {
  const userId = requireAuth(ctx)
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, userId), columns: { role: true, onboardingCompletedAt: true },
  })
  if (!user?.onboardingCompletedAt || (user.role !== 'seller' && user.role !== 'both')) {
    throw new GraphQLError('Your account role cannot browse buyer requests', {
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
    lat: (post: BuyerPost, _: unknown, ctx: Context) => post.buyerId === ctx.userId ? post.lat : publicCoordinate(post.lat),
    lng: (post: BuyerPost, _: unknown, ctx: Context) => post.buyerId === ctx.userId ? post.lng : publicCoordinate(post.lng),
    locationText: (post: BuyerPost, _: unknown, ctx: Context) => post.buyerId === ctx.userId ? post.locationText : publicLocationText(post.locationText),
  },

  Query: {
    buyerPosts: async (
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
      await requireSellerView(ctx)
      const page = searchPage(limit, offset)

      return ctx.db.query.buyerPosts.findMany({
        where: buyerWhere(filters),
        orderBy: (bp) => desc(bp.createdAt),
        limit: Math.min(page.limit, MAX_PAGE_SIZE),
        offset: page.offset,
      })
    },

    buyerPostSearch: async (_: unknown, { limit = 20, offset = 0, filters, search, bounds, sort }: {
      limit?: number; offset?: number; filters?: BuyerFilters; search?: string;
      bounds?: MapBounds; sort?: BuyerSort
    }, ctx: Context) => {
      await requireSellerView(ctx)
      const page = searchPage(limit, offset)
      const where = buyerWhere(filters, search, bounds)
      const [items, totals] = await Promise.all([
        ctx.db.query.buyerPosts.findMany({ where, orderBy: buyerOrder(sort), ...page }),
        ctx.db.select({ total: count() }).from(buyerPosts).where(where),
      ])
      const totalCount = totals[0]?.total ?? 0
      return { items, totalCount, hasNextPage: page.offset + items.length < totalCount }
    },

    buyerPost: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      const userId = requireAuth(ctx)
      const post = await ctx.db.query.buyerPosts.findFirst({
        where: (bp, { eq }) => eq(bp.id, id),
      })
      if (post && post.buyerId !== userId) await requireSellerView(ctx)
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
          bedroomsMin: data.bedroomsMin ?? 0,
          bathroomsMin: data.bathroomsMin ?? 0,
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

      const priceMin = data.priceMin ?? Number(existing.priceMin)
      const priceMax = data.priceMax ?? Number(existing.priceMax)
      const floorMin = data.floorMin !== undefined ? data.floorMin : existing.floorMin
      const floorMax = data.floorMax !== undefined ? data.floorMax : existing.floorMax
      if (priceMin >= priceMax || (floorMin != null && floorMax != null && floorMin > floorMax)) {
        throw new GraphQLError('Price or floor range is invalid', { extensions: { code: 'BAD_USER_INPUT' } })
      }

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

    reactivateBuyerPost: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      const userId = requireAuth(ctx)
      await requireBuyerRole(ctx, userId)
      const existing = await ctx.db.query.buyerPosts.findFirst({ where: eq(buyerPosts.id, id) })
      if (!existing) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } })
      requireOwnership(existing, userId)
      const [updated] = await ctx.db.update(buyerPosts)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(buyerPosts.id, id)).returning()
      return updated
    },
  },
}
