import { GraphQLError } from 'graphql'
import { and, eq, gte, lte, isNull, or, sql } from 'drizzle-orm'
import { buyerPosts, sellerPosts } from '../../db/schema.js'
import type { Context } from '../../context.js'

// ─── Haversine distance (km) ──────────────────────────────────────────────────
// Returns a Drizzle SQL expression for the great-circle distance between a
// fixed point (lat1, lng1 — known at query time) and a varying row column pair.
// LEAST(1.0, ...) guards against floating-point values slightly above 1 that
// would make acos throw.

function haversineKm(
  fixedLat: number,
  fixedLng: number,
  colLat: typeof buyerPosts.lat | typeof sellerPosts.lat,
  colLng: typeof buyerPosts.lng | typeof sellerPosts.lng
) {
  return sql<number>`
    6371.0 * acos(
      LEAST(1.0,
        cos(radians(${colLat})) * cos(radians(${fixedLat})) *
        cos(radians(${fixedLng}) - radians(${colLng})) +
        sin(radians(${colLat})) * sin(radians(${fixedLat}))
      )
    )
  `
}

export const matchingResolvers = {
  Query: {
    // Given a seller post, find all active buyer criteria that it satisfies.
    matchingBuyerPosts: async (
      _: unknown,
      { sellerPostId }: { sellerPostId: string },
      ctx: Context
    ) => {
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

      const conditions = [
        eq(buyerPosts.isActive, true),
        eq(buyerPosts.propertyType, post.propertyType),
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

      return ctx.db
        .select()
        .from(buyerPosts)
        .where(and(...conditions))
    },

    // Given a buyer post, find all active seller listings that match the criteria.
    matchingSellerPosts: async (
      _: unknown,
      { buyerPostId }: { buyerPostId: string },
      ctx: Context
    ) => {
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

      return ctx.db
        .select()
        .from(sellerPosts)
        .where(and(...conditions))
    },
  },
}
