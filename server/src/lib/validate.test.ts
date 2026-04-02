import { describe, it, expect } from 'vitest'
import { GraphQLError } from 'graphql'
import {
  validate,
  createSellerPostSchema,
  createBuyerPostSchema,
  updateBuyerPostSchema,
  sendMessageSchema,
  startConversationSchema,
  upsertUserSchema,
} from './validate.js'

// ─── validate() helper ────────────────────────────────────────────────────────

describe('validate()', () => {
  it('returns parsed data on valid input', () => {
    const result = validate(upsertUserSchema, { email: 'a@b.com' })
    expect(result.email).toBe('a@b.com')
  })

  it('throws GraphQLError with BAD_USER_INPUT on invalid input', () => {
    let thrown: unknown
    try {
      validate(upsertUserSchema, { email: 'not-an-email' })
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(GraphQLError)
    expect((thrown as GraphQLError).extensions?.code).toBe('BAD_USER_INPUT')
  })
})

// ─── Seller post ──────────────────────────────────────────────────────────────

const validSellerPost = {
  title: 'Nice flat',
  locationText: 'Lisbon, Portugal',
  lat: 38.7,
  lng: -9.1,
  propertyType: 'apartment' as const,
  price: 250_000,
  bedrooms: 2,
  bathrooms: 1,
}

describe('createSellerPostSchema', () => {
  it('accepts a valid seller post', () => {
    expect(() => validate(createSellerPostSchema, validSellerPost)).not.toThrow()
  })

  it('rejects a negative price', () => {
    expect(() =>
      validate(createSellerPostSchema, { ...validSellerPost, price: -1 })
    ).toThrow(GraphQLError)
  })

  it('rejects price of zero', () => {
    expect(() =>
      validate(createSellerPostSchema, { ...validSellerPost, price: 0 })
    ).toThrow(GraphQLError)
  })

  it('rejects latitude out of bounds', () => {
    expect(() =>
      validate(createSellerPostSchema, { ...validSellerPost, lat: 91 })
    ).toThrow(GraphQLError)
  })

  it('rejects longitude out of bounds', () => {
    expect(() =>
      validate(createSellerPostSchema, { ...validSellerPost, lng: 181 })
    ).toThrow(GraphQLError)
  })

  it('rejects more than 20 images', () => {
    const images = Array.from({ length: 21 }, (_, i) => `https://example.com/${i}.jpg`)
    expect(() =>
      validate(createSellerPostSchema, { ...validSellerPost, images })
    ).toThrow(GraphQLError)
  })

  it('rejects non-URL image entries', () => {
    expect(() =>
      validate(createSellerPostSchema, { ...validSellerPost, images: ['not-a-url'] })
    ).toThrow(GraphQLError)
  })

  it('rejects an empty title', () => {
    expect(() =>
      validate(createSellerPostSchema, { ...validSellerPost, title: '' })
    ).toThrow(GraphQLError)
  })

  it('rejects a title over 200 characters', () => {
    expect(() =>
      validate(createSellerPostSchema, { ...validSellerPost, title: 'a'.repeat(201) })
    ).toThrow(GraphQLError)
  })
})

// ─── Buyer post ───────────────────────────────────────────────────────────────

const validBuyerPost = {
  title: 'Looking for a flat',
  locationText: 'Lisbon, Portugal',
  lat: 38.7,
  lng: -9.1,
  radiusKm: 10,
  propertyType: 'apartment' as const,
  priceMin: 100_000,
  priceMax: 300_000,
  bedroomsMin: 2,
  bathroomsMin: 1,
}

describe('createBuyerPostSchema', () => {
  it('accepts a valid buyer post', () => {
    expect(() => validate(createBuyerPostSchema, validBuyerPost)).not.toThrow()
  })

  it('rejects priceMin >= priceMax', () => {
    expect(() =>
      validate(createBuyerPostSchema, { ...validBuyerPost, priceMin: 300_000, priceMax: 300_000 })
    ).toThrow(GraphQLError)
  })

  it('rejects priceMin > priceMax', () => {
    expect(() =>
      validate(createBuyerPostSchema, { ...validBuyerPost, priceMin: 400_000, priceMax: 300_000 })
    ).toThrow(GraphQLError)
  })

  it('rejects a negative radius', () => {
    expect(() =>
      validate(createBuyerPostSchema, { ...validBuyerPost, radiusKm: -5 })
    ).toThrow(GraphQLError)
  })

  it('rejects a radius over 500 km', () => {
    expect(() =>
      validate(createBuyerPostSchema, { ...validBuyerPost, radiusKm: 501 })
    ).toThrow(GraphQLError)
  })
})

describe('updateBuyerPostSchema — partial price range cross-validation', () => {
  it('accepts a partial update with only priceMin', () => {
    expect(() =>
      validate(updateBuyerPostSchema, { priceMin: 50_000 })
    ).not.toThrow()
  })

  it('rejects when both prices are provided and priceMin >= priceMax', () => {
    expect(() =>
      validate(updateBuyerPostSchema, { priceMin: 200_000, priceMax: 100_000 })
    ).toThrow(GraphQLError)
  })
})

// ─── Messages ─────────────────────────────────────────────────────────────────

describe('sendMessageSchema', () => {
  const validConversationId = '123e4567-e89b-12d3-a456-426614174000'

  it('accepts a valid message', () => {
    expect(() =>
      validate(sendMessageSchema, { conversationId: validConversationId, body: 'Hello!' })
    ).not.toThrow()
  })

  it('rejects an empty body', () => {
    expect(() =>
      validate(sendMessageSchema, { conversationId: validConversationId, body: '' })
    ).toThrow(GraphQLError)
  })

  it('rejects a body over 5000 characters', () => {
    expect(() =>
      validate(sendMessageSchema, { conversationId: validConversationId, body: 'a'.repeat(5001) })
    ).toThrow(GraphQLError)
  })

  it('rejects a non-UUID conversationId', () => {
    expect(() =>
      validate(sendMessageSchema, { conversationId: 'not-a-uuid', body: 'Hi' })
    ).toThrow(GraphQLError)
  })
})

// ─── Start conversation ───────────────────────────────────────────────────────

describe('startConversationSchema', () => {
  const uuid = '123e4567-e89b-12d3-a456-426614174000'

  it('accepts buyerPostId only', () => {
    expect(() => validate(startConversationSchema, { buyerPostId: uuid })).not.toThrow()
  })

  it('accepts sellerPostId only', () => {
    expect(() => validate(startConversationSchema, { sellerPostId: uuid })).not.toThrow()
  })

  it('rejects when both are provided', () => {
    expect(() =>
      validate(startConversationSchema, { buyerPostId: uuid, sellerPostId: uuid })
    ).toThrow(GraphQLError)
  })

  it('rejects when neither is provided', () => {
    expect(() => validate(startConversationSchema, {})).toThrow(GraphQLError)
  })
})
