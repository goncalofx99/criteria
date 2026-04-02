# CRITERIA — Backend Reference

> Complete reference for frontend developers. Every operation, field, validation rule, and error code is documented here.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Endpoints](#2-endpoints)
3. [Authentication](#3-authentication)
4. [GraphQL Schema — Full Reference](#4-graphql-schema--full-reference)
5. [Validation Rules](#5-validation-rules)
6. [Matching Logic](#6-matching-logic)
7. [Real-time Subscriptions](#7-real-time-subscriptions)
8. [Example Operations](#8-example-operations)
9. [Error Handling](#9-error-handling)
10. [Email Privacy](#10-email-privacy)

---

## 1. Overview

CRITERIA is a fully bidirectional real estate marketplace. Both buyers and sellers publish posts — sellers list properties they have for sale, buyers post criteria for what they want to buy. The matching engine runs in both directions: a seller can discover which buyer criteria their listing satisfies, and a buyer can discover which active listings match their criteria.

**Tech stack:**

| Layer | Technology |
|---|---|
| HTTP server | [Hono](https://hono.dev/) |
| GraphQL server | Apollo Server v4 (`@apollo/server`) |
| GraphQL transport | `graphql-ws` over WebSocket (subscriptions) |
| ORM | Drizzle ORM |
| Database | Supabase-hosted PostgreSQL |
| Auth | Supabase Google OAuth — JWT verified via JWKS |

**Production base URL:** `https://criteria-newn.onrender.com`

---

## 2. Endpoints

| Purpose | Protocol | URL |
|---|---|---|
| GraphQL (queries & mutations) | HTTP POST | `https://criteria-newn.onrender.com/graphql` |
| GraphQL (introspection, GET) | HTTP GET | `https://criteria-newn.onrender.com/graphql` |
| GraphQL (subscriptions) | WebSocket | `wss://criteria-newn.onrender.com/graphql` |
| Health check | HTTP GET | `https://criteria-newn.onrender.com/health` |

All GraphQL operations — queries, mutations, and subscriptions — go through the single `/graphql` endpoint. The WebSocket connection uses the `graphql-ws` subprotocol (`graphql-transport-ws`).

---

## 3. Authentication

### How it works

CRITERIA uses Supabase Google OAuth. The frontend authenticates entirely through the Supabase client library. Once the user completes the Google OAuth flow, Supabase issues a signed JWT (JSON Web Token). The backend verifies this JWT on every request using Supabase's JWKS endpoint.

**Flow:**

1. User signs in via Supabase Google OAuth on the frontend.
2. Supabase client provides an `access_token` (JWT).
3. Frontend sends this JWT to the backend on every request.
4. Backend verifies the JWT signature against `https://<supabase-project>.supabase.co/.well-known/jwks.json`.
5. The verified `sub` claim (Supabase user UUID) becomes the `userId` for the request.

### Sending the JWT

Include the JWT as a Bearer token in the `Authorization` header on every HTTP request:

```
Authorization: Bearer <supabase_access_token>
```

For WebSocket subscriptions, pass the token in `connectionParams` (see [Section 7](#7-real-time-subscriptions)).

### First login — syncing the user to the database

Supabase manages authentication, but CRITERIA maintains its own `users` table. **After every login (and on app startup if a session already exists), call `upsertUser`** to ensure the user record exists and is up to date in the database.

This mutation is idempotent — it inserts on first call and updates on subsequent calls. It must be called with a valid JWT in the `Authorization` header.

### Auth requirements per operation

| Operation | Requires Auth |
|---|---|
| `me` | No (returns `null` if unauthenticated) |
| `sellerPosts` | No |
| `sellerPost` | No |
| `buyerPosts` | No |
| `buyerPost` | No |
| `matchingBuyerPosts` | No |
| `matchingSellerPosts` | No |
| `mySellerPosts` | **Yes** |
| `myBuyerPosts` | **Yes** |
| `myConversations` | **Yes** |
| `conversation` | **Yes** (must be a participant) |
| `upsertUser` | **Yes** |
| `createSellerPost` | **Yes** |
| `updateSellerPost` | **Yes** (must be owner) |
| `deactivateSellerPost` | **Yes** (must be owner) |
| `createBuyerPost` | **Yes** |
| `updateBuyerPost` | **Yes** (must be owner) |
| `deactivateBuyerPost` | **Yes** (must be owner) |
| `startConversation` | **Yes** |
| `sendMessage` | **Yes** (must be a participant) |
| `messageSent` subscription | **Yes** (must be a participant) |

---

## 4. GraphQL Schema — Full Reference

### Enums

#### `UserRole`

```graphql
enum UserRole {
  buyer
  seller
  both
}
```

#### `PropertyType`

```graphql
enum PropertyType {
  apartment
  house
  land
  commercial
}
```

---

### Types

#### `User`

Represents an authenticated user synced from Supabase.

| Field | Type | Notes |
|---|---|---|
| `id` | `ID!` | UUID — same as the Supabase `auth.users.id` |
| `email` | `String` | **Privacy-restricted.** Only non-null when querying your own user. Always `null` for other users. See [Section 10](#10-email-privacy). |
| `fullName` | `String` | Display name. May be null if not provided. |
| `avatarUrl` | `String` | URL to the user's profile picture. May be null. |
| `role` | `UserRole!` | Defaults to `buyer` if not specified on upsert. |
| `createdAt` | `String!` | ISO 8601 timestamp. |
| `updatedAt` | `String!` | ISO 8601 timestamp. |

#### `SellerPost`

A concrete property listing — what a seller **has**.

| Field | Type | Notes |
|---|---|---|
| `id` | `ID!` | UUID |
| `seller` | `User!` | The user who created this listing. |
| `title` | `String!` | Listing title. |
| `description` | `String` | Optional free-text description. |
| `locationText` | `String!` | Human-readable location label. |
| `lat` | `Float!` | Latitude of the property. |
| `lng` | `Float!` | Longitude of the property. |
| `propertyType` | `PropertyType!` | Matched against `BuyerPost.propertyType`. |
| `price` | `Float!` | Asking price. Matched against `BuyerPost.priceMin` / `priceMax`. |
| `bedrooms` | `Int!` | Number of bedrooms. Matched against `BuyerPost.bedroomsMin`. |
| `bathrooms` | `Int!` | Number of bathrooms. Matched against `BuyerPost.bathroomsMin`. |
| `areaSqm` | `Float` | Floor area in m². Optional. Matched against `BuyerPost.areaSqmMin`. |
| `images` | `[String!]!` | Array of image URLs. Empty array if none provided. |
| `isActive` | `Boolean!` | `false` after `deactivateSellerPost`. Inactive posts are excluded from public listing queries and matching. |
| `createdAt` | `String!` | ISO 8601 timestamp. |
| `updatedAt` | `String!` | ISO 8601 timestamp. |

#### `BuyerPost`

A criteria listing — what a buyer **wants**.

| Field | Type | Notes |
|---|---|---|
| `id` | `ID!` | UUID |
| `buyer` | `User!` | The user who created this criteria post. |
| `title` | `String!` | Criteria title. |
| `description` | `String` | Optional free-text description. |
| `locationText` | `String!` | Human-readable label for the desired area. |
| `lat` | `Float!` | Latitude of the desired area centre. |
| `lng` | `Float!` | Longitude of the desired area centre. |
| `radiusKm` | `Float!` | Search radius in kilometres from the centre point. |
| `propertyType` | `PropertyType!` | Matched against `SellerPost.propertyType`. |
| `priceMin` | `Float!` | Minimum acceptable price. |
| `priceMax` | `Float!` | Maximum acceptable price. |
| `bedroomsMin` | `Int!` | Minimum number of bedrooms required. |
| `bathroomsMin` | `Int!` | Minimum number of bathrooms required. |
| `areaSqmMin` | `Float` | Minimum floor area in m². `null` means no minimum preference. |
| `isActive` | `Boolean!` | `false` after `deactivateBuyerPost`. |
| `createdAt` | `String!` | ISO 8601 timestamp. |
| `updatedAt` | `String!` | ISO 8601 timestamp. |

#### `Conversation`

A messaging thread between one buyer and one seller, originating from a post.

| Field | Type | Notes |
|---|---|---|
| `id` | `ID!` | UUID |
| `buyerPost` | `BuyerPost` | Set when a seller initiated the conversation by reaching out to a buyer post. `null` otherwise. |
| `sellerPost` | `SellerPost` | Set when a buyer initiated the conversation by reaching out to a seller post. `null` otherwise. |
| `buyer` | `User!` | The buyer participant. |
| `seller` | `User!` | The seller participant. |
| `messages` | `[Message!]!` | All messages in the conversation, ordered descending by `createdAt`. |
| `createdAt` | `String!` | ISO 8601 timestamp. |

Exactly one of `buyerPost` or `sellerPost` will be non-null on a given conversation record. Either can become `null` if the originating post is deleted.

#### `Message`

A single chat message within a conversation.

| Field | Type | Notes |
|---|---|---|
| `id` | `ID!` | UUID |
| `sender` | `User!` | The user who sent the message. |
| `body` | `String!` | Message text content. |
| `createdAt` | `String!` | ISO 8601 timestamp. |

---

### Queries

#### `me`

```graphql
me: User
```

Returns the currently authenticated user, or `null` if not authenticated. Does not require auth — unauthenticated calls simply return `null`.

---

#### `sellerPosts`

```graphql
sellerPosts(limit: Int, offset: Int): [SellerPost!]!
```

Returns paginated active seller listings, ordered by `createdAt` descending.

| Argument | Type | Default | Notes |
|---|---|---|---|
| `limit` | `Int` | `20` | Maximum 50. Values above 50 are clamped to 50. |
| `offset` | `Int` | `0` | For pagination. |

Returns only posts where `isActive = true`.

---

#### `sellerPost`

```graphql
sellerPost(id: ID!): SellerPost
```

Returns a single seller post by ID, or `null` if not found. Returns both active and inactive posts (useful for owners viewing their own deactivated listings).

---

#### `mySellerPosts`

```graphql
mySellerPosts: [SellerPost!]!
```

Returns all seller posts (active and inactive) belonging to the authenticated user, ordered by `createdAt` descending. **Requires auth.**

---

#### `buyerPosts`

```graphql
buyerPosts(limit: Int, offset: Int): [BuyerPost!]!
```

Returns paginated active buyer criteria posts, ordered by `createdAt` descending.

| Argument | Type | Default | Notes |
|---|---|---|---|
| `limit` | `Int` | `20` | Maximum 50. Values above 50 are clamped to 50. |
| `offset` | `Int` | `0` | For pagination. |

Returns only posts where `isActive = true`.

---

#### `buyerPost`

```graphql
buyerPost(id: ID!): BuyerPost
```

Returns a single buyer post by ID, or `null` if not found.

---

#### `myBuyerPosts`

```graphql
myBuyerPosts: [BuyerPost!]!
```

Returns all buyer posts (active and inactive) belonging to the authenticated user, ordered by `createdAt` descending. **Requires auth.**

---

#### `myConversations`

```graphql
myConversations: [Conversation!]!
```

Returns all conversations where the authenticated user is either the buyer or the seller, ordered by `createdAt` descending. **Requires auth.**

---

#### `conversation`

```graphql
conversation(id: ID!): Conversation
```

Returns a single conversation by ID. Returns `null` if not found. **Requires auth.** Throws `FORBIDDEN` if the authenticated user is not a participant.

---

#### `matchingBuyerPosts`

```graphql
matchingBuyerPosts(sellerPostId: ID!): [BuyerPost!]!
```

Given a seller post, returns all active buyer criteria posts that the seller listing satisfies. This is the seller's discovery query — "which buyers are looking for something like my property?"

Throws `NOT_FOUND` if the seller post does not exist. See [Section 6](#6-matching-logic) for the full matching algorithm.

---

#### `matchingSellerPosts`

```graphql
matchingSellerPosts(buyerPostId: ID!): [SellerPost!]!
```

Given a buyer criteria post, returns all active seller listings that match the criteria. This is the buyer's discovery query — "which properties on the market fit what I want?"

Throws `NOT_FOUND` if the buyer post does not exist. See [Section 6](#6-matching-logic) for the full matching algorithm.

---

### Mutations

#### `upsertUser`

```graphql
upsertUser(input: UpsertUserInput!): User!
```

**Requires auth.** Call this immediately after every Google login to sync the Supabase user into the CRITERIA database. Inserts on first call; updates `email`, `fullName`, `avatarUrl`, and optionally `role` on subsequent calls. Role is only updated when explicitly provided.

**Input: `UpsertUserInput`**

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | `String!` | Yes | Must be a valid email address. |
| `fullName` | `String` | No | Max 150 characters. |
| `avatarUrl` | `String` | No | Must be a valid URL if provided. |
| `role` | `UserRole` | No | Defaults to `buyer` on first insert. Not overwritten on update if omitted. |

---

#### `createSellerPost`

```graphql
createSellerPost(input: CreateSellerPostInput!): SellerPost!
```

**Requires auth.** Creates a new seller listing owned by the authenticated user. New posts are active by default.

**Input: `CreateSellerPostInput`**

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | `String!` | Yes | 1–200 characters. |
| `description` | `String` | No | Max 2000 characters. |
| `locationText` | `String!` | Yes | 1–300 characters. Human-readable label. |
| `lat` | `Float!` | Yes | −90 to 90. |
| `lng` | `Float!` | Yes | −180 to 180. |
| `propertyType` | `PropertyType!` | Yes | `apartment`, `house`, `land`, or `commercial`. |
| `price` | `Float!` | Yes | Must be greater than 0. |
| `bedrooms` | `Int!` | Yes | Integer ≥ 0. |
| `bathrooms` | `Int!` | Yes | Integer ≥ 0. |
| `areaSqm` | `Float` | No | Must be greater than 0 if provided. |
| `images` | `[String!]` | No | Array of valid URLs. Max 20 images. |

---

#### `updateSellerPost`

```graphql
updateSellerPost(id: ID!, input: UpdateSellerPostInput!): SellerPost!
```

**Requires auth.** Updates a seller post. **Must be the owner.** All fields are optional — only provided fields are updated. Validation rules are the same as `createSellerPost` for each field that is provided.

Throws `NOT_FOUND` if the post does not exist. Throws `FORBIDDEN` if not the owner.

**Input: `UpdateSellerPostInput`** — all fields from `CreateSellerPostInput`, all optional.

---

#### `deactivateSellerPost`

```graphql
deactivateSellerPost(id: ID!): SellerPost!
```

**Requires auth.** Sets `isActive = false` on a seller post. **Must be the owner.** Deactivated posts no longer appear in `sellerPosts` or matching queries. Returns the updated post.

Throws `NOT_FOUND` if the post does not exist. Throws `FORBIDDEN` if not the owner.

---

#### `createBuyerPost`

```graphql
createBuyerPost(input: CreateBuyerPostInput!): BuyerPost!
```

**Requires auth.** Creates a new buyer criteria post owned by the authenticated user.

**Input: `CreateBuyerPostInput`**

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | `String!` | Yes | 1–200 characters. |
| `description` | `String` | No | Max 2000 characters. |
| `locationText` | `String!` | Yes | 1–300 characters. |
| `lat` | `Float!` | Yes | −90 to 90. Centre of the search area. |
| `lng` | `Float!` | Yes | −180 to 180. Centre of the search area. |
| `radiusKm` | `Float!` | Yes | Search radius in km. Must be > 0 and ≤ 500. |
| `propertyType` | `PropertyType!` | Yes | `apartment`, `house`, `land`, or `commercial`. |
| `priceMin` | `Float!` | Yes | Must be ≥ 0. Must be less than `priceMax`. |
| `priceMax` | `Float!` | Yes | Must be > 0. Must be greater than `priceMin`. |
| `bedroomsMin` | `Int!` | Yes | Integer ≥ 0. |
| `bathroomsMin` | `Int!` | Yes | Integer ≥ 0. |
| `areaSqmMin` | `Float` | No | Must be > 0 if provided. `null` means no preference. |

---

#### `updateBuyerPost`

```graphql
updateBuyerPost(id: ID!, input: UpdateBuyerPostInput!): BuyerPost!
```

**Requires auth.** Updates a buyer post. **Must be the owner.** All fields are optional. If both `priceMin` and `priceMax` are provided, `priceMin` must be less than `priceMax`.

Throws `NOT_FOUND` if the post does not exist. Throws `FORBIDDEN` if not the owner.

**Input: `UpdateBuyerPostInput`** — all fields from `CreateBuyerPostInput`, all optional, with the same per-field validation rules.

---

#### `deactivateBuyerPost`

```graphql
deactivateBuyerPost(id: ID!): BuyerPost!
```

**Requires auth.** Sets `isActive = false` on a buyer post. **Must be the owner.** Deactivated posts no longer appear in `buyerPosts` or matching queries. Returns the updated post.

Throws `NOT_FOUND` if the post does not exist. Throws `FORBIDDEN` if not the owner.

---

#### `startConversation`

```graphql
startConversation(input: StartConversationInput!): Conversation!
```

**Requires auth.** Opens a conversation between the authenticated user and the owner of the referenced post. **Idempotent** — if a conversation already exists between the same buyer/seller pair for the same post, the existing conversation is returned rather than creating a duplicate.

**Direction rules:**
- Provide `sellerPostId` when a **buyer** wants to contact a seller about their listing.
- Provide `buyerPostId` when a **seller** wants to contact a buyer about their criteria post.

**Input: `StartConversationInput`**

| Field | Type | Notes |
|---|---|---|
| `buyerPostId` | `ID` | UUID. Provide when a seller is initiating. |
| `sellerPostId` | `ID` | UUID. Provide when a buyer is initiating. |

Exactly one of `buyerPostId` or `sellerPostId` must be provided. Providing both, or neither, throws `BAD_USER_INPUT`.

Throws `NOT_FOUND` if the referenced post does not exist or is inactive.
Throws `BAD_USER_INPUT` if the authenticated user is the owner of the referenced post (cannot start a conversation with yourself).

---

#### `sendMessage`

```graphql
sendMessage(conversationId: ID!, body: String!): Message!
```

**Requires auth.** Sends a message in a conversation. The authenticated user must be a participant (buyer or seller) in the conversation. Triggers a real-time event on the `messageSent` subscription for all subscribers of that conversation.

| Argument | Type | Notes |
|---|---|---|
| `conversationId` | `ID!` | Must be a valid UUID. |
| `body` | `String!` | 1–5000 characters. Cannot be empty. |

Throws `NOT_FOUND` if the conversation does not exist.
Throws `FORBIDDEN` if the authenticated user is not a participant.

---

### Subscriptions

#### `messageSent`

```graphql
messageSent(conversationId: ID!): Message!
```

**Requires auth over WebSocket.** Fires whenever a new message is sent in the specified conversation. Auth and participant membership are verified at subscription time — unauthenticated or non-participant clients receive an error immediately on subscribe and the connection is closed for that subscription.

Returns a `Message` object each time a new message is created via `sendMessage`.

---

## 5. Validation Rules

All input validation is performed server-side with Zod. Validation failures throw a `BAD_USER_INPUT` error with a descriptive message listing every failing field.

### Shared field rules

| Field | Rule |
|---|---|
| `title` | String, min 1 character, max 200 characters. |
| `description` | String, max 2000 characters. Optional. |
| `locationText` | String, min 1 character, max 300 characters. |
| `lat` | Number, min −90, max 90. |
| `lng` | Number, min −180, max 180. |
| `propertyType` | One of: `apartment`, `house`, `land`, `commercial`. |

### `UpsertUserInput`

| Field | Rule |
|---|---|
| `email` | Valid email address format. Required. |
| `fullName` | String, max 150 characters. Optional. |
| `avatarUrl` | Valid URL format. Optional. |
| `role` | One of: `buyer`, `seller`, `both`. Optional. |

### `CreateSellerPostInput` / `UpdateSellerPostInput`

| Field | Rule |
|---|---|
| `price` | Positive number (> 0). Required on create. |
| `bedrooms` | Integer ≥ 0. Required on create. |
| `bathrooms` | Integer ≥ 0. Required on create. |
| `areaSqm` | Positive number (> 0). Optional. |
| `images` | Array of valid URLs. Max 20 items. Optional. |

### `CreateBuyerPostInput` / `UpdateBuyerPostInput`

| Field | Rule |
|---|---|
| `radiusKm` | Positive number (> 0), max 500. Required on create. |
| `priceMin` | Number ≥ 0. Required on create. |
| `priceMax` | Positive number (> 0). Required on create. |
| `bedroomsMin` | Integer ≥ 0. Required on create. |
| `bathroomsMin` | Integer ≥ 0. Required on create. |
| `areaSqmMin` | Positive number (> 0). Optional. |
| Cross-field | `priceMin` must be strictly less than `priceMax` when both are present. |

### `sendMessage`

| Field | Rule |
|---|---|
| `conversationId` | Valid UUID format. |
| `body` | String, min 1 character, max 5000 characters. |

### `startConversation`

| Field | Rule |
|---|---|
| `buyerPostId` | Valid UUID format. Optional. |
| `sellerPostId` | Valid UUID format. Optional. |
| Cross-field | Exactly one of `buyerPostId` or `sellerPostId` must be provided — not both, not neither. |

---

## 6. Matching Logic

The matching engine runs entirely in the database as a single SQL query. Both directions use the same set of conditions, applied symmetrically.

### Conditions applied

All five conditions must be true for a match to be returned.

| Condition | Description |
|---|---|
| `propertyType` equality | `sellerPost.propertyType = buyerPost.propertyType` |
| Price range | `sellerPost.price >= buyerPost.priceMin AND sellerPost.price <= buyerPost.priceMax` |
| Bedrooms minimum | `sellerPost.bedrooms >= buyerPost.bedroomsMin` |
| Bathrooms minimum | `sellerPost.bathrooms >= buyerPost.bathroomsMin` |
| Geographic radius | The great-circle distance between the seller property coordinates and the buyer's search centre must be ≤ `buyerPost.radiusKm`. |
| Area minimum (conditional) | If the buyer has specified `areaSqmMin`, then `sellerPost.areaSqm >= buyerPost.areaSqmMin`. If the buyer has no area preference (`areaSqmMin = null`), this condition is skipped entirely. If the seller has not provided an `areaSqm` value, the condition is also skipped (treated as acceptable). |

Only active posts (`isActive = true`) are included on both sides.

### Geographic distance — Haversine formula

Distance is computed directly in PostgreSQL using the haversine (great-circle) formula:

```
distance_km = 6371.0 * acos(
  LEAST(1.0,
    cos(radians(rowLat)) * cos(radians(fixedLat)) *
    cos(radians(fixedLng) - radians(rowLng)) +
    sin(radians(rowLat)) * sin(radians(fixedLat))
  )
)
```

The Earth radius used is **6371.0 km**. `LEAST(1.0, ...)` guards against floating-point values marginally above 1.0 that would cause `acos` to throw a domain error.

### `matchingBuyerPosts(sellerPostId)` — seller's perspective

Given a seller post, returns all active buyer criteria posts that the seller listing satisfies. The seller post's coordinates are the fixed point; each buyer post's `lat`/`lng` (search centre) is the varying column. The match requires the seller's property to fall within the buyer's `radiusKm` circle.

### `matchingSellerPosts(buyerPostId)` — buyer's perspective

Given a buyer criteria post, returns all active seller listings that match. The buyer post's `lat`/`lng` (search centre) is the fixed point; each seller post's coordinates are the varying column. The same radius constraint applies — the seller's property must be within the buyer's search radius.

---

## 7. Real-time Subscriptions

Subscriptions use the `graphql-ws` library (`graphql-transport-ws` WebSocket subprotocol). Standard Apollo WebSocket (`subscriptions-transport-ws`) is **not** supported.

### Connecting

Install the `graphql-ws` package:

```bash
npm install graphql-ws
```

### Authentication over WebSocket

The `Authorization` header cannot be sent on a WebSocket handshake in browser environments. Instead, pass the JWT in the `connectionParams` object when creating the client:

```typescript
import { createClient } from 'graphql-ws'

const wsClient = createClient({
  url: 'wss://criteria-newn.onrender.com/graphql',
  connectionParams: async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return {
      Authorization: token ? `Bearer ${token}` : '',
    }
  },
})
```

The server reads the token from `connectionParams.Authorization` for WebSocket connections and applies the same JWT verification as HTTP requests.

### Subscribing to messages

Each subscription is scoped to a single conversation ID. The server verifies at subscribe time that:
1. The user is authenticated.
2. The conversation exists.
3. The user is a participant in the conversation.

If any check fails, an error is returned immediately and the subscription does not start.

---

## 8. Example Operations

### `upsertUser`

Call this after every login to sync the user to the CRITERIA database.

```graphql
mutation UpsertUser($input: UpsertUserInput!) {
  upsertUser(input: $input) {
    id
    email
    fullName
    avatarUrl
    role
    createdAt
    updatedAt
  }
}
```

```json
{
  "input": {
    "email": "user@example.com",
    "fullName": "Jane Smith",
    "avatarUrl": "https://lh3.googleusercontent.com/...",
    "role": "buyer"
  }
}
```

---

### `createSellerPost`

```graphql
mutation CreateSellerPost($input: CreateSellerPostInput!) {
  createSellerPost(input: $input) {
    id
    title
    description
    locationText
    lat
    lng
    propertyType
    price
    bedrooms
    bathrooms
    areaSqm
    images
    isActive
    createdAt
    seller {
      id
      fullName
    }
  }
}
```

```json
{
  "input": {
    "title": "Modern 2-bed apartment in Lisbon",
    "description": "Bright, south-facing apartment with river views.",
    "locationText": "Alfama, Lisbon",
    "lat": 38.7139,
    "lng": -9.1334,
    "propertyType": "apartment",
    "price": 320000,
    "bedrooms": 2,
    "bathrooms": 1,
    "areaSqm": 85,
    "images": [
      "https://example.com/images/img1.jpg",
      "https://example.com/images/img2.jpg"
    ]
  }
}
```

---

### `createBuyerPost`

```graphql
mutation CreateBuyerPost($input: CreateBuyerPostInput!) {
  createBuyerPost(input: $input) {
    id
    title
    description
    locationText
    lat
    lng
    radiusKm
    propertyType
    priceMin
    priceMax
    bedroomsMin
    bathroomsMin
    areaSqmMin
    isActive
    createdAt
    buyer {
      id
      fullName
    }
  }
}
```

```json
{
  "input": {
    "title": "Looking for apartment in central Lisbon",
    "description": "Relocating for work, need to be near the city centre.",
    "locationText": "Lisbon City Centre",
    "lat": 38.7223,
    "lng": -9.1393,
    "radiusKm": 5,
    "propertyType": "apartment",
    "priceMin": 250000,
    "priceMax": 400000,
    "bedroomsMin": 2,
    "bathroomsMin": 1,
    "areaSqmMin": 70
  }
}
```

---

### `matchingSellerPosts`

Given a buyer criteria post, find all seller listings that match.

```graphql
query MatchingSellerPosts($buyerPostId: ID!) {
  matchingSellerPosts(buyerPostId: $buyerPostId) {
    id
    title
    locationText
    lat
    lng
    price
    bedrooms
    bathrooms
    areaSqm
    propertyType
    images
    seller {
      id
      fullName
      avatarUrl
    }
  }
}
```

```json
{
  "buyerPostId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

### `matchingBuyerPosts`

Given a seller listing, find all buyer criteria posts that it satisfies.

```graphql
query MatchingBuyerPosts($sellerPostId: ID!) {
  matchingBuyerPosts(sellerPostId: $sellerPostId) {
    id
    title
    locationText
    lat
    lng
    radiusKm
    priceMin
    priceMax
    bedroomsMin
    bathroomsMin
    areaSqmMin
    propertyType
    buyer {
      id
      fullName
      avatarUrl
    }
  }
}
```

```json
{
  "sellerPostId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
}
```

---

### `startConversation`

Buyer initiates a conversation about a seller's listing:

```graphql
mutation StartConversation($input: StartConversationInput!) {
  startConversation(input: $input) {
    id
    sellerPost {
      id
      title
    }
    buyerPost {
      id
      title
    }
    buyer {
      id
      fullName
    }
    seller {
      id
      fullName
    }
    messages {
      id
      body
      createdAt
      sender {
        id
        fullName
      }
    }
    createdAt
  }
}
```

```json
{
  "input": {
    "sellerPostId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  }
}
```

For a seller initiating contact with a buyer, use `buyerPostId` instead:

```json
{
  "input": {
    "buyerPostId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

---

### `sendMessage`

```graphql
mutation SendMessage($conversationId: ID!, $body: String!) {
  sendMessage(conversationId: $conversationId, body: $body) {
    id
    body
    createdAt
    sender {
      id
      fullName
      avatarUrl
    }
  }
}
```

```json
{
  "conversationId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "body": "Hi, I'm very interested in your property. Is it still available?"
}
```

---

### `messageSent` subscription

```graphql
subscription MessageSent($conversationId: ID!) {
  messageSent(conversationId: $conversationId) {
    id
    body
    createdAt
    sender {
      id
      fullName
      avatarUrl
    }
  }
}
```

**Full client example using `graphql-ws`:**

```typescript
import { createClient } from 'graphql-ws'
import { supabase } from './supabaseClient'

const wsClient = createClient({
  url: 'wss://criteria-newn.onrender.com/graphql',
  connectionParams: async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return {
      Authorization: token ? `Bearer ${token}` : '',
    }
  },
})

function subscribeToConversation(
  conversationId: string,
  onMessage: (message: { id: string; body: string; createdAt: string; sender: { id: string; fullName: string } }) => void,
  onError: (error: unknown) => void
) {
  const unsubscribe = wsClient.subscribe(
    {
      query: `
        subscription MessageSent($conversationId: ID!) {
          messageSent(conversationId: $conversationId) {
            id
            body
            createdAt
            sender {
              id
              fullName
              avatarUrl
            }
          }
        }
      `,
      variables: { conversationId },
    },
    {
      next: (data) => {
        if (data.data?.messageSent) {
          onMessage(data.data.messageSent)
        }
      },
      error: onError,
      complete: () => console.log('Subscription closed'),
    }
  )

  // Returns a cleanup function — call it to unsubscribe
  return unsubscribe
}
```

---

## 9. Error Handling

All errors follow the GraphQL errors specification. Each error object in the `errors` array contains:
- `message` — human-readable description.
- `extensions.code` — machine-readable error code.

### Error codes

| Code | HTTP analogue | When it is thrown |
|---|---|---|
| `UNAUTHENTICATED` | 401 | The operation requires a valid JWT, but none was provided or the token is invalid/expired. |
| `FORBIDDEN` | 403 | The authenticated user does not have permission to perform this action (e.g., editing another user's post, querying a conversation they are not part of). |
| `NOT_FOUND` | 404 | The referenced resource (post, conversation) does not exist. |
| `BAD_USER_INPUT` | 400 | Input validation failed (Zod), or a business-logic constraint was violated (e.g., providing both `buyerPostId` and `sellerPostId` to `startConversation`, or attempting to message yourself). |
| `INTERNAL_SERVER_ERROR` | 500 | An unexpected server error occurred. In production, the message is masked to prevent leaking implementation details. |

### Handling errors on the client

```typescript
const result = await apolloClient.mutate({ mutation: SEND_MESSAGE, variables })

if (result.errors) {
  for (const error of result.errors) {
    const code = error.extensions?.code

    switch (code) {
      case 'UNAUTHENTICATED':
        // Redirect to login or refresh the session token
        break
      case 'FORBIDDEN':
        // Show a permission denied message
        break
      case 'NOT_FOUND':
        // Resource was deleted or never existed
        break
      case 'BAD_USER_INPUT':
        // Show the validation message to the user
        console.error(error.message)
        break
      default:
        // Unexpected server error
        console.error('Server error:', error.message)
    }
  }
}
```

### Production error masking

Unhandled exceptions (i.e., anything that does not explicitly throw a `GraphQLError`) are caught by Apollo Server's default error formatter. In production, the original error message is replaced with `"Internal server error"` and only the `INTERNAL_SERVER_ERROR` code is exposed. Stack traces are never sent to the client.

---

## 10. Email Privacy

`User.email` is **intentionally masked** for all users except the currently authenticated user.

The resolver checks whether the requesting user's ID matches the ID of the `User` object being resolved:

- If `ctx.userId === user.id` — the email is returned as-is.
- Otherwise — `null` is returned regardless of what is stored in the database.

This applies everywhere a `User` type is resolved: as a standalone `me` query, as `SellerPost.seller`, as `BuyerPost.buyer`, as `Conversation.buyer` / `Conversation.seller`, or as `Message.sender`.

**Practical implication:** Do not depend on `email` being present when displaying other users' profiles (e.g., post authors, conversation counterparts). Use `fullName` and `avatarUrl` for display purposes. `email` is only reliably available on the result of `me` and `upsertUser` for the currently authenticated user.
