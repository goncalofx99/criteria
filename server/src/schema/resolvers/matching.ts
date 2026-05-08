import { GraphQLError } from 'graphql'
import { and, eq, gte, lte, isNull, or, sql, arrayContains } from 'drizzle-orm'
import { buyerPosts, sellerPosts } from '../../db/schema.js'
import type { Context } from '../../context.js'

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
  const deltaLng = radiusKm / (111.0 * Math.cos((centerLat * Math.PI) / 180))
  return [
    gte(latCol, centerLat - deltaLat),
    lte(latCol, centerLat + deltaLat),
    gte(lngCol, centerLng - deltaLng),
    lte(lngCol, centerLng + deltaLng),
  ]
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

export const matchingResolvers = {
  Query: {
    // Given a seller post, find all active buyer criteria that it satisfies.
    matchingBuyerPosts: async (
      _: unknown,
      { sellerPostId, limit = 50, offset = 0 }: { sellerPostId: string; limit?: number; offset?: number },
      ctx: Context
    ) => {
      requireAuth(ctx)

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

      // We need to check against each buyer's own radiusKm, so we use a generous
      // bounding box (max realistic radius = 200km) and let Haversine refine.
      const MAX_BUYER_RADIUS_KM = 200
      const conditions = [
        eq(buyerPosts.isActive, true),
        eq(buyerPosts.propertyType, post.propertyType),
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

      return ctx.db
        .select()
        .from(buyerPosts)
        .where(and(...conditions))
        .limit(Math.min(limit, MAX_MATCHING_RESULTS))
        .offset(offset)
    },

    // Given a buyer post, find all active seller listings that match the criteria.
    matchingSellerPosts: async (
      _: unknown,
      { buyerPostId, limit = 50, offset = 0 }: { buyerPostId: string; limit?: number; offset?: number },
      ctx: Context
    ) => {
      requireAuth(ctx)

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

      const conditions = [
        eq(sellerPosts.isActive, true),
        eq(sellerPosts.propertyType, post.propertyType),
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
        conditions.push(
          or(
            isNull(sellerPosts.areaSqm),
            gte(sellerPosts.areaSqm, post.areaSqmMin)
          )!
        )
      }

      // ── v2 filters: buyer's preferences ──

      if (post.yearBuiltMin !== null) {
        conditions.push(
          or(
            isNull(sellerPosts.yearBuilt),
            gte(sellerPosts.yearBuilt, post.yearBuiltMin)
          )!
        )
      }

      if (post.conditions && post.conditions.length > 0) {
        // Seller's condition must be one of the buyer's acceptable conditions
        conditions.push(
          sql`${sellerPosts.condition}::text = ANY(${post.conditions})`
        )
      }

      if (post.requiresBalcony === true) {
        conditions.push(eq(sellerPosts.hasBalcony, true))
      }

      if (post.requiresCentralHeating === true) {
        conditions.push(eq(sellerPosts.hasCentralHeating, true))
      }

      if (post.floorMin !== null) {
        conditions.push(
          or(isNull(sellerPosts.floor), gte(sellerPosts.floor, post.floorMin))!
        )
      }

      if (post.floorMax !== null) {
        conditions.push(
          or(isNull(sellerPosts.floor), lte(sellerPosts.floor, post.floorMax))!
        )
      }

      if (post.requiredAmenities.length > 0) {
        conditions.push(arrayContains(sellerPosts.amenities, post.requiredAmenities))
      }

      return ctx.db
        .select()
        .from(sellerPosts)
        .where(and(...conditions))
        .limit(Math.min(limit, MAX_MATCHING_RESULTS))
        .offset(offset)
    },
  },
}
