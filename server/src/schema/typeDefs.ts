export const typeDefs = `#graphql

  enum UserRole {
    buyer
    seller
    both
  }

  enum PropertyType {
    apartment
    house
    land
    commercial
  }

  # ─── Types ──────────────────────────────────────────────────────────────────

  type User {
    id: ID!
    email: String!
    fullName: String
    avatarUrl: String
    role: UserRole!
    createdAt: String!
    updatedAt: String!
  }

  # What a seller HAS — a concrete property listing.
  type SellerPost {
    id: ID!
    seller: User!
    title: String!
    description: String
    locationText: String!
    lat: Float!
    lng: Float!
    # ── Matchable fields (compared against BuyerPost ranges/minimums) ─────────
    propertyType: PropertyType!
    price: Float!
    bedrooms: Int!
    bathrooms: Int!
    areaSqm: Float
    # ─────────────────────────────────────────────────────────────────────────
    images: [String!]!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  # What a buyer WANTS — a criteria listing.
  # Each range/min field maps directly to the corresponding SellerPost field.
  type BuyerPost {
    id: ID!
    buyer: User!
    title: String!
    description: String
    locationText: String!
    lat: Float!
    lng: Float!
    radiusKm: Float!
    # ── Matchable fields (ranges/minimums applied to SellerPost values) ───────
    propertyType: PropertyType!
    priceMin: Float!
    priceMax: Float!
    bedroomsMin: Int!
    bathroomsMin: Int!
    areaSqmMin: Float       # null = no minimum preference
    # ─────────────────────────────────────────────────────────────────────────
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  # ─── Inputs ─────────────────────────────────────────────────────────────────

  input UpsertUserInput {
    email: String!
    fullName: String
    avatarUrl: String
    role: UserRole
  }

  input CreateSellerPostInput {
    title: String!
    description: String
    locationText: String!
    lat: Float!
    lng: Float!
    propertyType: PropertyType!
    price: Float!
    bedrooms: Int!
    bathrooms: Int!
    areaSqm: Float
    images: [String!]
  }

  input UpdateSellerPostInput {
    title: String
    description: String
    locationText: String
    lat: Float
    lng: Float
    propertyType: PropertyType
    price: Float
    bedrooms: Int
    bathrooms: Int
    areaSqm: Float
    images: [String!]
  }

  input CreateBuyerPostInput {
    title: String!
    description: String
    locationText: String!
    lat: Float!
    lng: Float!
    radiusKm: Float!
    propertyType: PropertyType!
    priceMin: Float!
    priceMax: Float!
    bedroomsMin: Int!
    bathroomsMin: Int!
    areaSqmMin: Float
  }

  input UpdateBuyerPostInput {
    title: String
    description: String
    locationText: String
    lat: Float
    lng: Float
    radiusKm: Float
    propertyType: PropertyType
    priceMin: Float
    priceMax: Float
    bedroomsMin: Int
    bathroomsMin: Int
    areaSqmMin: Float
  }

  # ─── Queries ─────────────────────────────────────────────────────────────────

  type Query {
    # Auth
    me: User

    # Seller posts
    sellerPosts(limit: Int, offset: Int): [SellerPost!]!
    sellerPost(id: ID!): SellerPost
    mySellerPosts: [SellerPost!]!

    # Buyer posts
    buyerPosts(limit: Int, offset: Int): [BuyerPost!]!
    buyerPost(id: ID!): BuyerPost
    myBuyerPosts: [BuyerPost!]!
  }

  # ─── Mutations ───────────────────────────────────────────────────────────────

  type Mutation {
    # Called by the frontend right after Google login to sync the user.
    upsertUser(input: UpsertUserInput!): User!

    # Seller posts
    createSellerPost(input: CreateSellerPostInput!): SellerPost!
    updateSellerPost(id: ID!, input: UpdateSellerPostInput!): SellerPost!
    deactivateSellerPost(id: ID!): SellerPost!

    # Buyer posts
    createBuyerPost(input: CreateBuyerPostInput!): BuyerPost!
    updateBuyerPost(id: ID!, input: UpdateBuyerPostInput!): BuyerPost!
    deactivateBuyerPost(id: ID!): BuyerPost!
  }
`
