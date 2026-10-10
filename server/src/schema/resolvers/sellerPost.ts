import { GraphQLError } from 'graphql'
import { eq, desc, asc, and, or, gte, lte, inArray, arrayContains, count, sql, type SQL } from 'drizzle-orm'
import { sellerPosts, users } from '../../db/schema.js'
import { validate, createSellerPostSchema, updateSellerPostSchema } from '../../lib/validate.js'
import type { Context } from '../../context.js'
import type { SellerPost } from '../../db/schema.js'
import { assertFilterRange, boundsCondition, publicAdministrativeLocationCondition, publicLocalitySearchCondition, publicMapCoordinate, searchPage, textCondition, type MapBounds } from '../../lib/search.js'
import { publicCoordinate, publicLocationText } from '../../lib/publicLocation.js'
import { validSellerImageUrl } from '../../lib/uploadKey.js'

const MAX_PAGE_SIZE = 200

type SellerFilters = {
  propertyType?: string; priceMin?: number; priceMax?: number; bedroomsMin?: number;
  bathroomsMin?: number; areaSqmMin?: number; areaSqmMax?: number;
  yearBuiltMin?: number; condition?: string[]; hasBalcony?: boolean;
  hasCentralHeating?: boolean; amenities?: string[]
}
type SellerSort = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc' | 'price_per_sqm_asc' | 'price_per_sqm_desc'

export function sellerWhere(
  filters?: SellerFilters | null,
  search?: string | null,
  bounds?: MapBounds | null,
  location?: { district?: string | null; municipality?: string | null } | null,
) {
  const conditions: SQL[] = [eq(sellerPosts.isActive, true)]
  if (filters) {
    assertFilterRange(filters.priceMin, filters.priceMax, 'price')
    assertFilterRange(filters.areaSqmMin, filters.areaSqmMax, 'area')
    assertFilterRange(filters.bedroomsMin, undefined, 'bedrooms')
    assertFilterRange(filters.bathroomsMin, undefined, 'bathrooms')
    assertFilterRange(filters.yearBuiltMin, undefined, 'year built')
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
  const text = textCondition(search, sellerPosts.title, sellerPosts.description)
  const locality = publicLocalitySearchCondition(search, sellerPosts.locationText)
  if (text) conditions.push(locality ? or(text, locality)! : text)
  const administrativeLocation = publicAdministrativeLocationCondition(location?.district, location?.municipality, sellerPosts.locationText)
  if (administrativeLocation) conditions.push(administrativeLocation)
  const mapBounds = boundsCondition(bounds, publicMapCoordinate(sellerPosts.lat), publicMapCoordinate(sellerPosts.lng))
  if (mapBounds) conditions.push(mapBounds)
  return and(...conditions)!
}

function sellerOrder(sort: SellerSort = 'newest'): SQL[] {
  const pricePerSqm = sql`(${sellerPosts.price}::numeric / NULLIF(${sellerPosts.areaSqm}, 0))`
  const first: SQL = {
    newest: desc(sellerPosts.createdAt), oldest: asc(sellerPosts.createdAt),
    price_asc: asc(sellerPosts.price), price_desc: desc(sellerPosts.price),
    area_asc: sql`${sellerPosts.areaSqm} ASC NULLS LAST`,
    area_desc: sql`${sellerPosts.areaSqm} DESC NULLS LAST`,
    price_per_sqm_asc: sql`${pricePerSqm} ASC NULLS LAST`,
    price_per_sqm_desc: sql`${pricePerSqm} DESC NULLS LAST`,
  }[sort] ?? desc(sellerPosts.createdAt)
  return [first, desc(sellerPosts.createdAt), desc(sellerPosts.id)]
}

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

function requireOwnedImages(images: string[] | undefined, userId: string, existingImages: string[] = []) {
  const existing = new Set(existingImages)
  if (images?.some((image) => !existing.has(image) && !validSellerImageUrl(userId, image, process.env.R2_PUBLIC_URL ?? ''))) {
    throw new GraphQLError('Listing photos must be uploaded to your own account', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }
}

async function requireSellerRole(ctx: Context, userId: string) {
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true, onboardingCompletedAt: true },
  })
  if (!user || !user.onboardingCompletedAt || (user.role !== 'seller' && user.role !== 'both')) {
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
    lat: (post: SellerPost, _: unknown, ctx: Context) => post.sellerId === ctx.userId ? post.lat : publicCoordinate(post.lat),
    lng: (post: SellerPost, _: unknown, ctx: Context) => post.sellerId === ctx.userId ? post.lng : publicCoordinate(post.lng),
    locationText: (post: SellerPost, _: unknown, ctx: Context) => post.sellerId === ctx.userId ? post.locationText : publicLocationText(post.locationText),
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
      const page = searchPage(limit, offset)

      return ctx.db.query.sellerPosts.findMany({
        where: sellerWhere(filters),
        orderBy: (sp) => desc(sp.createdAt),
        limit: Math.min(page.limit, MAX_PAGE_SIZE),
        offset: page.offset,
      })
    },

    sellerPostSearch: async (_: unknown, { limit = 20, offset = 0, filters, search, district, municipality, bounds, sort }: {
      limit?: number; offset?: number; filters?: SellerFilters; search?: string;
      district?: string; municipality?: string;
      bounds?: MapBounds; sort?: SellerSort
    }, ctx: Context) => {
      const page = searchPage(limit, offset)
      const where = sellerWhere(filters, search, bounds, { district, municipality })
      const [items, totals] = await Promise.all([
        ctx.db.query.sellerPosts.findMany({ where, orderBy: sellerOrder(sort), ...page }),
        ctx.db.select({ total: count() }).from(sellerPosts).where(where),
      ])
      const totalCount = totals[0]?.total ?? 0
      return { items, totalCount, hasNextPage: page.offset + items.length < totalCount }
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
      requireOwnedImages(data.images, userId)

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
          bedrooms: data.bedrooms ?? 0,
          bathrooms: data.bathrooms ?? 0,
          areaSqm: data.areaSqm ?? null,
          yearBuilt: data.yearBuilt ?? null,
          condition: data.condition ?? 'good',
          floor: data.floor ?? null,
          totalFloors: data.totalFloors ?? null,
          hasBalcony: data.hasBalcony ?? false,
          hasCentralHeating: data.hasCentralHeating ?? false,
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
      // Existing third-party image URLs may be retained while old listings are
      // migrated; an edit cannot introduce any new unowned URL.
      requireOwnedImages(data.images, userId, existing.images)

      // A property changing into a residential type must have the fields
      // needed to describe and match a home. Explicitly clearing one of those
      // fields on an existing home is also invalid.
      if (data.propertyType === 'apartment' || data.propertyType === 'house' ||
          ((existing.propertyType === 'apartment' || existing.propertyType === 'house') &&
            (data.areaSqm === null || data.yearBuilt === null))) {
        validate(createSellerPostSchema, {
          ...existing,
          ...data,
          price: data.price ?? Number(existing.price),
          propertyType: data.propertyType ?? existing.propertyType,
        })
      }

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

    reactivateSellerPost: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      const userId = requireAuth(ctx)
      await requireSellerRole(ctx, userId)
      const existing = await ctx.db.query.sellerPosts.findFirst({ where: eq(sellerPosts.id, id) })
      if (!existing) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } })
      requireOwnership(existing, userId)
      const [updated] = await ctx.db.update(sellerPosts)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(sellerPosts.id, id)).returning()
      return updated
    },
  },
}
