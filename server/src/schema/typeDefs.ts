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

  enum PropertyCondition {
    new
    renovated
    good
    needs_renovation
  }

  # ─── Types ──────────────────────────────────────────────────────────────────

  type User {
    id: ID!
    # Only returned for the authenticated user themselves — null for all others.
    email: String
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
    # ── Building details ─────────────────────────────────────────────────────
    yearBuilt: Int
    condition: PropertyCondition!
    floor: Int
    totalFloors: Int
    # ── Required amenities (always answered yes/no) ──────────────────────────
    hasBalcony: Boolean!
    hasCentralHeating: Boolean!
    # ── Optional amenities (free-form list of canonical keys) ────────────────
    amenities: [String!]!
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
    # ── Optional preference filters; null/empty = no preference ──────────────
    yearBuiltMin: Int
    conditions: [PropertyCondition!]
    floorMin: Int
    floorMax: Int
    requiresBalcony: Boolean
    requiresCentralHeating: Boolean
    requiredAmenities: [String!]!
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
    areaSqm: Float!
    yearBuilt: Int!
    condition: PropertyCondition!
    floor: Int
    totalFloors: Int
    hasBalcony: Boolean!
    hasCentralHeating: Boolean!
    amenities: [String!]
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
    yearBuilt: Int
    condition: PropertyCondition
    floor: Int
    totalFloors: Int
    hasBalcony: Boolean
    hasCentralHeating: Boolean
    amenities: [String!]
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
    yearBuiltMin: Int
    conditions: [PropertyCondition!]
    floorMin: Int
    floorMax: Int
    requiresBalcony: Boolean
    requiresCentralHeating: Boolean
    requiredAmenities: [String!]
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
    yearBuiltMin: Int
    conditions: [PropertyCondition!]
    floorMin: Int
    floorMax: Int
    requiresBalcony: Boolean
    requiresCentralHeating: Boolean
    requiredAmenities: [String!]
  }

  # ─── Conversation & Messages ─────────────────────────────────────────────────

  type Conversation {
    id: ID!
    # The post that originated this conversation (one will be null)
    buyerPost: BuyerPost
    sellerPost: SellerPost
    buyer: User!
    seller: User!
    messages: [Message!]!
    createdAt: String!
  }

  type Message {
    id: ID!
    sender: User!
    body: String!
    createdAt: String!
  }

  input StartConversationInput {
    # Provide exactly one — seller initiates via buyerPostId, buyer via sellerPostId
    buyerPostId: ID
    sellerPostId: ID
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

    # Conversations — only the authenticated participant can query these
    myConversations: [Conversation!]!
    conversation(id: ID!): Conversation

    # Matching — cross-direction discovery queries
    # Given a seller listing, return all active buyer criteria it satisfies.
    matchingBuyerPosts(sellerPostId: ID!): [BuyerPost!]!
    # Given a buyer criteria post, return all active seller listings that match.
    matchingSellerPosts(buyerPostId: ID!): [SellerPost!]!
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

    # Conversations — idempotent: returns existing if already started
    startConversation(input: StartConversationInput!): Conversation!
    sendMessage(conversationId: ID!, body: String!): Message!
  }

  # ─── Subscriptions ───────────────────────────────────────────────────────────

  type Subscription {
    # Real-time chat — fires whenever a new message is sent in this conversation.
    # Only participants of the conversation will receive events (enforced server-side).
    messageSent(conversationId: ID!): Message!
  }
`
