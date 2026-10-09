import { z } from 'zod'
import { GraphQLError } from 'graphql'

// ─── Shared field schemas ─────────────────────────────────────────────────────

const title = z.string().min(1, 'Title is required').max(200)
const description = z.string().max(2000).nullish()
const locationText = z.string().min(1, 'Location is required').max(300)
const lat = z.number().min(-90).max(90)
const lng = z.number().min(-180).max(180)
const propertyType = z.enum(['apartment', 'house', 'land', 'commercial'])
const propertyCondition = z.enum(['new', 'renovated', 'good', 'needs_renovation'])
const positivePrice = z.number().positive('Price must be greater than 0')
const nonNegativeInt = z.number().int().min(0)
const positiveArea = z.number().positive()
const positiveAreaOptional = positiveArea.nullish()
const currentYear = new Date().getFullYear()
const yearBuilt = z
  .number()
  .int()
  .min(1500, 'yearBuilt is implausibly old')
  .max(currentYear + 5, 'yearBuilt is in the future')
const floor = z.number().int().min(-5).max(200)
const amenityKey = z.string().min(1).max(40)
const amenityList = z.array(amenityKey).max(40)

// ─── Input schemas ────────────────────────────────────────────────────────────

export const upsertUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().max(150).nullish(),
  avatarUrl: z.string().url().nullish(),
  role: z.enum(['buyer', 'seller', 'both']).optional(),
  age: z.number().int().min(18, 'You must be 18 or older').max(120).optional(),
})

export const createSellerPostSchema = z.object({
  title,
  description,
  locationText,
  lat,
  lng,
  propertyType,
  price: positivePrice,
  bedrooms: nonNegativeInt.optional(),
  bathrooms: nonNegativeInt.optional(),
  areaSqm: positiveAreaOptional,
  yearBuilt: yearBuilt.nullish(),
  condition: propertyCondition.optional(),
  floor: floor.nullish(),
  totalFloors: z.number().int().positive().max(200).nullish(),
  hasBalcony: z.boolean().optional(),
  hasCentralHeating: z.boolean().optional(),
  amenities: amenityList.optional(),
  images: z.array(z.string().url()).max(20).optional(),
}).superRefine((data, ctx) => {
  if (data.propertyType !== 'apartment' && data.propertyType !== 'house') return
  for (const field of ['bedrooms', 'bathrooms', 'areaSqm', 'yearBuilt', 'condition', 'hasBalcony', 'hasCentralHeating'] as const) {
    if (data[field] == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Required for residential properties' })
    }
  }
})

export const updateSellerPostSchema = z.object({
  title: title.optional(), description, locationText: locationText.optional(),
  lat: lat.optional(), lng: lng.optional(), propertyType: propertyType.optional(),
  price: positivePrice.optional(), bedrooms: nonNegativeInt.optional(),
  bathrooms: nonNegativeInt.optional(), areaSqm: positiveAreaOptional,
  yearBuilt: yearBuilt.nullish(), condition: propertyCondition.optional(),
  floor: floor.nullish(), totalFloors: z.number().int().positive().max(200).nullish(),
  hasBalcony: z.boolean().optional(), hasCentralHeating: z.boolean().optional(),
  amenities: amenityList.optional(), images: z.array(z.string().url()).max(20).optional(),
})

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
    bedroomsMin: nonNegativeInt.optional(),
    bathroomsMin: nonNegativeInt.optional(),
    areaSqmMin: positiveAreaOptional,
    yearBuiltMin: yearBuilt.nullish(),
    conditions: z.array(propertyCondition).max(4).nullish(),
    floorMin: floor.nullish(),
    floorMax: floor.nullish(),
    requiresBalcony: z.boolean().nullish(),
    requiresCentralHeating: z.boolean().nullish(),
    requiredAmenities: amenityList.optional(),
  })
  .refine((d) => d.priceMin < d.priceMax, {
    message: 'priceMin must be less than priceMax',
    path: ['priceMin'],
  })
  .refine(
    (d) =>
      d.floorMin == null ||
      d.floorMax == null ||
      d.floorMin <= d.floorMax,
    { message: 'floorMin must be ≤ floorMax', path: ['floorMin'] }
  )

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
    areaSqmMin: positiveAreaOptional,
    yearBuiltMin: yearBuilt.nullish(),
    conditions: z.array(propertyCondition).max(4).nullish(),
    floorMin: floor.nullish(),
    floorMax: floor.nullish(),
    requiresBalcony: z.boolean().nullish(),
    requiresCentralHeating: z.boolean().nullish(),
    requiredAmenities: amenityList.optional(),
  })
  .refine(
    (d) =>
      d.priceMin === undefined ||
      d.priceMax === undefined ||
      d.priceMin < d.priceMax,
    { message: 'priceMin must be less than priceMax', path: ['priceMin'] }
  )
  .refine(
    (d) =>
      d.floorMin == null ||
      d.floorMax == null ||
      d.floorMin <= d.floorMax,
    { message: 'floorMin must be ≤ floorMax', path: ['floorMin'] }
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
