import { GraphQLError } from 'graphql'
import { and, eq, gte, lte, isNull, or, sql, arrayContains, inArray, ne, type SQL } from 'drizzle-orm'
import { buyerPosts, sellerPosts, users } from '../../db/schema.js'
import type { Context } from '../../context.js'
import { searchPage } from '../../lib/search.js'

// ─── Haversine distance (km) ──────────────────────────────────────────────────
// Returns a Drizzle SQL expression for the great-circle distance between a
// fixed point (lat1, lng1 — known at query time) and a varying row column pair.
// GREATEST(-1.0, LEAST(1.0, ...)) guards against floating-point values outside
// the valid range for acos (which would throw).

function haversineKm(
  fixedLat: number,
  fixedLng: number,
  colLat: typeof buyerPosts.lat | typeof sellerPosts.lat,
  colLng: typeof buyerPosts.lng | typeof sellerPosts.lng
) {
  return sql<number>`
    6371.0 * acos(
      GREATEST(-1.0, LEAST(1.0,
        cos(radians(${colLat})) * cos(radians(${fixedLat})) *
        cos(radians(${fixedLng}) - radians(${colLng})) +
        sin(radians(${colLat})) * sin(radians(${fixedLat}))
      ))
    )
  `
}

// ─── Bounding-box pre-filter ──────────────────────────────────────────────────
// Eliminates most rows before the expensive trig computation.
// ~111 km per degree of latitude; longitude shrinks with cos(lat).

function boundingBoxConditions(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  latCol: typeof buyerPosts.lat | typeof sellerPosts.lat,
  lngCol: typeof buyerPosts.lng | typeof sellerPosts.lng
) {
  const deltaLat = radiusKm / 111.0
  const latitude = [gte(latCol, Math.max(-90, centerLat - deltaLat)), lte(latCol, Math.min(90, centerLat + deltaLat))]
  const maxAbsLat = Math.min(89.999, Math.max(Math.abs(centerLat - deltaLat), Math.abs(centerLat + deltaLat)))
  const deltaLng = radiusKm / (111.0 * Math.cos((maxAbsLat * Math.PI) / 180))
  if (deltaLng >= 180 || centerLat + deltaLat >= 90 || centerLat - deltaLat <= -90) return latitude
  const west = centerLng - deltaLng
  const east = centerLng + deltaLng
  if (west < -180) return [...latitude, or(gte(lngCol, west + 360), lte(lngCol, east))!]
  if (east > 180) return [...latitude, or(gte(lngCol, west), lte(lngCol, east - 360))!]
  return [...latitude, gte(lngCol, west), lte(lngCol, east)]
}

function requireAuth(ctx: Context) {
  if (!ctx.userId) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return ctx.userId
}

const MAX_MATCHING_RESULTS = 100

export function requiredAmenitiesCondition(amenities: string[]): SQL {
  return amenities.length
    ? sql`ARRAY[${sql.join(amenities.map((amenity) => sql`${amenity}`), sql`, `)}]::text[] @> ${buyerPosts.requiredAmenities}`
    : sql`cardinality(${buyerPosts.requiredAmenities}) = 0`
}

async function requireOwnerRole(ctx: Context, userId: string, role: 'buyer' | 'seller') {
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, userId), columns: { role: true, onboardingCompletedAt: true },
  })
  if (!user?.onboardingCompletedAt || (user.role !== role && user.role !== 'both')) {
    throw new GraphQLError('Your account role cannot view these matches', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
}

export const matchingResolvers = {
  Query: {
    // Given a seller post, find all active buyer criteria that it satisfies.
    matchingBuyerPosts: async (
      _: unknown,
      { sellerPostId, limit = 50, offset = 0 }: { sellerPostId: string; limit?: number; offset?: number },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)
      await requireOwnerRole(ctx, userId, 'seller')
      const page = searchPage(limit, offset)

      const [post] = await ctx.db
        .select()
        .from(sellerPosts)
        .where(eq(sellerPosts.id, sellerPostId))
        .limit(1)

      if (!post) {
        throw new GraphQLError('Seller post not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }
      if (post.sellerId !== userId) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } })
      if (!post.isActive) return []

      // Buyer radius is validated up to 500km; use that maximum for the
      // preliminary box and the row's actual radius for exact distance.
      const MAX_BUYER_RADIUS_KM = 500
      const conditions: SQL[] = [
        eq(buyerPosts.isActive, true),
        eq(buyerPosts.propertyType, post.propertyType),
        ne(buyerPosts.buyerId, userId),
        // Bounding-box pre-filter for lat/lng
        ...boundingBoxConditions(post.lat, post.lng, MAX_BUYER_RADIUS_KM, buyerPosts.lat, buyerPosts.lng),
        // Buyer's price range must contain seller's asking price
        lte(buyerPosts.priceMin, sql`${post.price}::numeric`),
        gte(buyerPosts.priceMax, sql`${post.price}::numeric`),
        // Buyer's minimums must be met by seller's property
        lte(buyerPosts.bedroomsMin, post.bedrooms),
        lte(buyerPosts.bathroomsMin, post.bathrooms),
        // Seller's property must be within the buyer's search radius
        lte(
          haversineKm(post.lat, post.lng, buyerPosts.lat, buyerPosts.lng),
          buyerPosts.radiusKm
        ),
      ]

      // areaSqmMin is nullable — skip the filter when the buyer has no preference
      if (post.areaSqm !== null) {
        conditions.push(
          or(
            isNull(buyerPosts.areaSqmMin),
            lte(buyerPosts.areaSqmMin, post.areaSqm)
          )!
        )
      }
      else conditions.push(isNull(buyerPosts.areaSqmMin))

      // ── v2 filters: buyer preferences that must be met by the seller's property ──

      // yearBuiltMin: buyer wants properties built after a certain year
      if (post.yearBuilt !== null) {
        conditions.push(
          or(
            isNull(buyerPosts.yearBuiltMin),
            lte(buyerPosts.yearBuiltMin, post.yearBuilt)
          )!
        )
      } else {
        // Seller has no yearBuilt — exclude buyers who require it
        conditions.push(isNull(buyerPosts.yearBuiltMin))
      }

      // requiresBalcony: if buyer requires it, seller must have it
      if (!post.hasBalcony) {
        conditions.push(
          or(
            isNull(buyerPosts.requiresBalcony),
            eq(buyerPosts.requiresBalcony, false)
          )!
        )
      }

      // requiresCentralHeating: if buyer requires it, seller must have it
      if (!post.hasCentralHeating) {
        conditions.push(
          or(
            isNull(buyerPosts.requiresCentralHeating),
            eq(buyerPosts.requiresCentralHeating, false)
          )!
        )
      }

      // floor range
      if (post.floor !== null) {
        conditions.push(
          or(isNull(buyerPosts.floorMin), lte(buyerPosts.floorMin, post.floor))!
        )
        conditions.push(
          or(isNull(buyerPosts.floorMax), gte(buyerPosts.floorMax, post.floor))!
        )
      }
      else conditions.push(isNull(buyerPosts.floorMin), isNull(buyerPosts.floorMax))

      conditions.push(sql`(
        ${buyerPosts.conditions} IS NULL OR cardinality(${buyerPosts.conditions}) = 0
        OR ${post.condition} = ANY(${buyerPosts.conditions})
      )`)
      conditions.push(requiredAmenitiesCondition(post.amenities))

      return ctx.db
        .select()
        .from(buyerPosts)
        .where(and(...conditions))
        .limit(Math.min(page.limit, MAX_MATCHING_RESULTS))
        .offset(page.offset)
    },

    // Given a buyer post, find all active seller listings that match the criteria.
    matchingSellerPosts: async (
      _: unknown,
      { buyerPostId, limit = 50, offset = 0 }: { buyerPostId: string; limit?: number; offset?: number },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)
      await requireOwnerRole(ctx, userId, 'buyer')
      const page = searchPage(limit, offset)

      const [post] = await ctx.db
        .select()
        .from(buyerPosts)
        .where(eq(buyerPosts.id, buyerPostId))
        .limit(1)

      if (!post) {
        throw new GraphQLError('Buyer post not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }
      if (post.buyerId !== userId) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } })
      if (!post.isActive) return []

      const conditions: SQL[] = [
        eq(sellerPosts.isActive, true),
        eq(sellerPosts.propertyType, post.propertyType),
        ne(sellerPosts.sellerId, userId),
        // Bounding-box pre-filter
        ...boundingBoxConditions(post.lat, post.lng, post.radiusKm, sellerPosts.lat, sellerPosts.lng),
        // Seller's price must be within buyer's range
        gte(sellerPosts.price, sql`${post.priceMin}::numeric`),
        lte(sellerPosts.price, sql`${post.priceMax}::numeric`),
        // Seller's property must meet buyer's minimums
        gte(sellerPosts.bedrooms, post.bedroomsMin),
        gte(sellerPosts.bathrooms, post.bathroomsMin),
        // Seller's property must be within the buyer's search radius
        lte(
          haversineKm(post.lat, post.lng, sellerPosts.lat, sellerPosts.lng),
          post.radiusKm
        ),
      ]

      if (post.areaSqmMin !== null) {
        conditions.push(gte(sellerPosts.areaSqm, post.areaSqmMin))
      }

      // ── v2 filters: buyer's preferences ──

      if (post.yearBuiltMin !== null) {
        conditions.push(gte(sellerPosts.yearBuilt, post.yearBuiltMin))
      }

      if (post.conditions && post.conditions.length > 0) {
        // Seller's condition must be one of the buyer's acceptable conditions
        conditions.push(inArray(sellerPosts.condition, post.conditions as (typeof sellerPosts.condition.enumValues[number])[]))
      }

      if (post.requiresBalcony === true) {
        conditions.push(eq(sellerPosts.hasBalcony, true))
      }

      if (post.requiresCentralHeating === true) {
        conditions.push(eq(sellerPosts.hasCentralHeating, true))
      }

      if (post.floorMin !== null) {
        conditions.push(gte(sellerPosts.floor, post.floorMin))
      }

      if (post.floorMax !== null) {
        conditions.push(lte(sellerPosts.floor, post.floorMax))
      }

      if (post.requiredAmenities.length > 0) {
        conditions.push(arrayContains(sellerPosts.amenities, post.requiredAmenities))
      }

      return ctx.db
        .select()
        .from(sellerPosts)
        .where(and(...conditions))
        .limit(Math.min(page.limit, MAX_MATCHING_RESULTS))
        .offset(page.offset)
    },
  },
}
