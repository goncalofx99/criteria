import { z } from 'zod'
import { GraphQLError } from 'graphql'

// ─── Shared field schemas ─────────────────────────────────────────────────────

const title = z.string().min(1, 'Title is required').max(200)
const description = z.string().max(2000).optional()
const locationText = z.string().min(1, 'Location is required').max(300)
const lat = z.number().min(-90).max(90)
const lng = z.number().min(-180).max(180)
const propertyType = z.enum(['apartment', 'house', 'land', 'commercial'])
const positivePrice = z.number().positive('Price must be greater than 0')
const nonNegativeInt = z.number().int().min(0)
const positiveArea = z.number().positive().optional()

// ─── Input schemas ────────────────────────────────────────────────────────────

export const upsertUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().max(150).optional(),
  avatarUrl: z.string().url().optional(),
  role: z.enum(['buyer', 'seller', 'both']).optional(),
})

export const createSellerPostSchema = z.object({
  title,
  description,
  locationText,
  lat,
  lng,
  propertyType,
  price: positivePrice,
  bedrooms: nonNegativeInt,
  bathrooms: nonNegativeInt,
  areaSqm: positiveArea,
  images: z.array(z.string().url()).max(20).optional(),
})

export const updateSellerPostSchema = createSellerPostSchema.partial()

export const createBuyerPostSchema = z
  .object({
    title,
    description,
    locationText,
    lat,
    lng,
    radiusKm: z.number().positive('Radius must be greater than 0').max(500),
    propertyType,
    priceMin: z.number().min(0),
    priceMax: positivePrice,
    bedroomsMin: nonNegativeInt,
    bathroomsMin: nonNegativeInt,
    areaSqmMin: positiveArea,
  })
  .refine((d) => d.priceMin < d.priceMax, {
    message: 'priceMin must be less than priceMax',
    path: ['priceMin'],
  })

export const updateBuyerPostSchema = z
  .object({
    title: title.optional(),
    description,
    locationText: locationText.optional(),
    lat: lat.optional(),
    lng: lng.optional(),
    radiusKm: z.number().positive().max(500).optional(),
    propertyType: propertyType.optional(),
    priceMin: z.number().min(0).optional(),
    priceMax: positivePrice.optional(),
    bedroomsMin: nonNegativeInt.optional(),
    bathroomsMin: nonNegativeInt.optional(),
    areaSqmMin: positiveArea,
  })
  .refine(
    (d) =>
      d.priceMin === undefined ||
      d.priceMax === undefined ||
      d.priceMin < d.priceMax,
    { message: 'priceMin must be less than priceMax', path: ['priceMin'] }
  )

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1, 'Message cannot be empty').max(5000),
})

export const startConversationSchema = z
  .object({
    buyerPostId: z.string().uuid().optional(),
    sellerPostId: z.string().uuid().optional(),
  })
  .refine(
    (d) => Boolean(d.buyerPostId) !== Boolean(d.sellerPostId),
    'Provide exactly one of buyerPostId or sellerPostId'
  )

// ─── Helper ───────────────────────────────────────────────────────────────────

export function validate<T>(schema: z.ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ')
    throw new GraphQLError(message, {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }
  return result.data
}
