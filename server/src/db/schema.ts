import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const propertyTypeEnum = pgEnum('property_type', [
  'apartment',
  'house',
  'land',
  'commercial',
])

export const userRoleEnum = pgEnum('user_role', ['buyer', 'seller', 'both'])

// ─── Users ────────────────────────────────────────────────────────────────────
// Mirrors Supabase auth.users — populated via upsertUser mutation on login.

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // same UUID as Supabase auth.users.id
  email: text('email').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('buyer'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Seller Posts (property listings) ────────────────────────────────────────
// What a seller HAS.
// These fields are intentionally comparable to BuyerPost fields so that
// matching queries can be written as simple range/equality checks.

export const sellerPosts = pgTable('seller_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  title: text('title').notNull(),
  description: text('description'),

  // Location — text label + coordinates for geo matching
  locationText: text('location_text').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),

  // ── Matchable fields ──────────────────────────────────────────────────────
  // A buyer's criteria is matched against these exact values.
  propertyType: propertyTypeEnum('property_type').notNull(), // matches BuyerPost.propertyType
  price: numeric('price', { precision: 12, scale: 2 }).notNull(), // matched against BuyerPost.priceMin / priceMax
  bedrooms: integer('bedrooms').notNull(), // matched against BuyerPost.bedroomsMin
  bathrooms: integer('bathrooms').notNull(), // matched against BuyerPost.bathroomsMin
  areaSqm: real('area_sqm'), // matched against BuyerPost.areaSqmMin / areaSqmMax

  images: text('images').array().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Buyer Posts (criteria / what-I-want listings) ───────────────────────────
// What a buyer WANTS.
// Each range/min field directly corresponds to a concrete field on SellerPost.
//
// Matching condition (future query):
//   sellerPost.propertyType  = buyerPost.propertyType
//   sellerPost.price        BETWEEN buyerPost.priceMin AND buyerPost.priceMax
//   sellerPost.bedrooms     >= buyerPost.bedroomsMin
//   sellerPost.bathrooms    >= buyerPost.bathroomsMin
//   sellerPost.areaSqm      >= buyerPost.areaSqmMin  (when set)
//   distance(sellerPost, buyerPost) <= buyerPost.radiusKm

export const buyerPosts = pgTable('buyer_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  buyerId: uuid('buyer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  title: text('title').notNull(),
  description: text('description'),

  // Location — desired area centre + search radius
  locationText: text('location_text').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  radiusKm: real('radius_km').notNull().default(10),

  // ── Matchable fields ──────────────────────────────────────────────────────
  propertyType: propertyTypeEnum('property_type').notNull(), // matches SellerPost.propertyType
  priceMin: numeric('price_min', { precision: 12, scale: 2 }).notNull(), // matches SellerPost.price
  priceMax: numeric('price_max', { precision: 12, scale: 2 }).notNull(), // matches SellerPost.price
  bedroomsMin: integer('bedrooms_min').notNull().default(0), // matches SellerPost.bedrooms
  bathroomsMin: integer('bathrooms_min').notNull().default(0), // matches SellerPost.bathrooms
  areaSqmMin: real('area_sqm_min'), // matches SellerPost.areaSqm (nullable = no preference)

  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type SellerPost = typeof sellerPosts.$inferSelect
export type NewSellerPost = typeof sellerPosts.$inferInsert
export type BuyerPost = typeof buyerPosts.$inferSelect
export type NewBuyerPost = typeof buyerPosts.$inferInsert
