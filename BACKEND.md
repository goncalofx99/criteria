# CRITERIA backend reference

This document reflects the current Hono, Apollo, Drizzle and PostgreSQL implementation in `server/`. The GraphQL schema and resolvers in `server/src/schema/` are the source of truth for exact field types.

## Runtime and setup

Run `pnpm --filter server typecheck`, `pnpm --filter server lint`, and `pnpm --filter server test` from the repository root. Start the API with `pnpm --filter server dev`. The HTTP GraphQL endpoint is `/graphql`; `graphql-ws` subscriptions use the same path on WebSocket. `/health` returns a basic health response.

Copy `server/.env.example` to `server/.env` and provide a database URL, a JWT secret of at least 32 characters, Google OAuth credentials, and R2 credentials. `FRONTEND_URL` is required in production and must be the exact deployed frontend origin. Use the direct `MIGRATION_URL` for DDL; the pooled `DATABASE_URL` is for normal requests. Apply migrations with `pnpm --filter server db:migrate` **before** deploying server code that reads new columns. Migration `0003` adds `users.onboarding_completed_at`; migration `0004` adds one-use password reset tokens. Existing password accounts are backfilled as onboarded; existing Google-only accounts must finish age and role onboarding.

Password recovery additionally requires `RESEND_API_KEY` and a verified `PASSWORD_RESET_FROM` email address. Without them, the request endpoint returns 503. The service sends plain-text reset links through Resend's HTTP API.

## Authentication

CRITERIA owns its user and session tables. Supabase is not used for the current auth flow. The API signs 15-minute JWT access tokens and rotates database-backed refresh tokens. Send `Authorization: Bearer <accessToken>` on GraphQL and upload requests. For subscriptions, send the same value in `connectionParams.authorization` or `connectionParams.Authorization`.

| Endpoint | Request | Result |
|---|---|---|
| `POST /auth/signup` | `{email,password,fullName?,role?,age}` | User, access token, refresh token. `age` must be an integer from 18 to 120. Email signup completes onboarding; upload an optional avatar after the account has an ID. |
| `POST /auth/signin` | `{email,password}` | User and new tokens. |
| `POST /auth/refresh` | `{refreshToken}` | Rotated access and refresh tokens. |
| `POST /auth/signout` | `{refreshToken}` | Revokes that refresh session. |
| `GET /auth/me` | Bearer token | Authenticated user. |
| `GET /auth/google?redirect=…` | Optional approved callback | Starts Google OAuth. The only callbacks are the configured `FRONTEND_URL/auth/callback` and `com.criteria.app://auth/callback`. An arbitrary URL is rejected. |
| `GET /auth/google/callback` | Google code and state | Redirects to the approved callback with a short-lived **single-use exchange code**, never tokens. |
| `POST /auth/google/exchange` | `{code}` | Access and refresh tokens. The code expires after two minutes and is consumed once. |
| `POST /auth/password-reset/request` | `{email}` | Generic success for known and unknown addresses; rate limited to one token per user per minute. Sends a 30-minute link to `/reset-password?token=…`. |
| `POST /auth/password-reset/confirm` | `{token,password}` | Changes password, consumes all that user's reset tokens, and revokes all refresh sessions. |

Google OAuth creates a user with `onboardingComplete: false`. The frontend must route such users to onboarding and call `upsertUser(input: {role, age, fullName?, avatarUrl?})`. The resolver requires a role and age from 18 to 120 before setting the completion timestamp. Existing users can use `upsertUser` to change role, name or avatar. New avatar URLs must point to their own `avatars/<userId>/` R2 path; unchanged legacy or Google picture URLs remain usable. It cannot change account email. The age confirmation time is stored, not the supplied age.

OAuth state and exchange codes currently live in process memory. Deploying multiple API instances or restarting during OAuth may invalidate an in-progress sign-in; use a shared short-lived store before scaling horizontally.

## GraphQL access and privacy

`me` returns `null` when signed out. All post lists and details require an authenticated user. Property listings are visible to all signed-in roles. Buyer requests are discoverable only by completed seller or both accounts; an owner can always open and manage their own request. `mySellerPosts` and `myBuyerPosts` include inactive posts for their owner. Inactive posts are excluded from Explore, search, and matching and hidden from other users' direct detail links.

`User.email` resolves only for that same authenticated user. For non-owners, post `lat` and `lng` resolve rounded to two decimals, and `locationText` is reduced to a locality or an approximate-area label. Owners receive stored coordinates and full location text. Map-bounds search uses the same rounded coordinates visible to non-owners. Matching always uses stored coordinates internally. Free-text descriptions remain user-supplied; they should not be used to publish a street address if an owner wants location privacy.

| Action | Required role and ownership |
|---|---|
| Create property | Completed seller or both |
| Create buyer request | Completed buyer or both |
| Update/archive own post | Owner |
| Republish property/request | Owner and corresponding current role |
| Start conversation from a property | Buyer or both, not the post owner |
| Start conversation from a buyer request | Seller or both, not the post owner |
| Read or send messages, subscribe | Conversation participant |
| `matchingSellerPosts` / `matchingBuyerPosts` | Completed corresponding role and source post owner |

## Search and post lifecycle

The existing `sellerPosts` and `buyerPosts` list fields remain for compatibility. Prefer the counted search fields for Explore:

```graphql
sellerPostSearch(
  limit: Int, offset: Int, filters: SellerPostFilters,
  search: String, bounds: MapBoundsInput, sort: SellerPostSort
): SellerPostSearchResult!

buyerPostSearch(
  limit: Int, offset: Int, filters: BuyerPostFilters,
  search: String, bounds: MapBoundsInput, sort: BuyerPostSort
): BuyerPostSearchResult!
```

Both results contain `items`, `totalCount`, and `hasNextPage`. The default limit is 20, the maximum is 200, and the default sort is newest first. A negative offset or invalid filter/map range yields `BAD_USER_INPUT`. `search` finds literal text in title, location label and description, up to 120 characters. `bounds` contains `north`, `south`, `east`, `west` floats; crossing the antimeridian is supported. Counts and items use the same active-post filters.

Seller sorts: `newest`, `oldest`, `price_asc`, `price_desc`, `area_asc`, `area_desc`, `price_per_sqm_asc`, `price_per_sqm_desc`. Buyer sorts: `newest`, `oldest`, `budget_asc`, `budget_desc` (budget sorts by `priceMax`). Sorting has stable created-at and ID tie-breakers. Area and price-per-area sorts place missing areas last.

Posts can be archived with `deactivateSellerPost(id)` or `deactivateBuyerPost(id)` and restored with `reactivateSellerPost(id)` or `reactivateBuyerPost(id)`. Owners can edit archived posts before republishing. Property types `land` and `commercial` may omit residential fields; the server defaults bedroom and bathroom counts to zero, leaves area and year built null, and uses neutral condition/amenity defaults. Apartment and house creation still requires bedroom, bathroom, area, year, condition, balcony and heating answers. Clearable optional fields accept explicit `null` in create/update GraphQL input.

For matches, both directions use the same price, type, minimum size/specs, distance, condition, floor, and amenity semantics. A missing seller value does not satisfy a buyer's required minimum. Buyer radius is validated up to 500 km. Matching is limited to active posts and excludes the current user's own opposite-side posts.

## Messaging and uploads

`startConversation(input: {sellerPostId})` starts or returns an existing buyer-to-seller conversation. `startConversation(input: {buyerPostId})` does the same for seller-to-buyer contact. `myConversations`, `conversation(id)`, `sendMessage`, and `messageSent` require participant access. Conversation messages resolve oldest first for reading. Inactive posts cannot start new conversations.

`POST /upload/presign` requires a bearer token and accepts `{key,contentType}` for JPEG, PNG, WebP or GIF. Keys must be `avatars/<ownUserId>/<safeFilename>` or `posts/<ownUserId>/<safeFilename>` with a matching image extension and content type. The response provides a five-minute R2 PUT URL and a public URL. The browser resizes images to at most 2000px and re-encodes them before upload, removing camera metadata such as embedded GPS coordinates. The browser uploads the prepared bytes directly to R2. The API does not inspect uploaded bytes or enforce file size at this endpoint, so a separate server-side image pipeline is needed before metadata removal and size limits can be guaranteed for every client.

New listing image URLs must point to the owner's `posts/<userId>/` path on the configured R2 public host. Existing external image URLs can stay on an edited legacy listing, but cannot be added again after removal. Public post coordinates are rounded to about neighbourhood scale. Public location labels come from a conservative city allowlist; unknown places display “Portugal” or “Approximate area”. Search matches arbitrary text in titles/descriptions, and only exact allowed city names against stored address segments. A structured locality field is needed to cover the full Portuguese geography without exposing street names or mislabeling a district as its city.

## Errors and verification

Expected GraphQL error codes are `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, and `BAD_USER_INPUT`. Production masks unexpected internal errors. The server test suite covers schema construction, input validation, OAuth redirect allowlisting, search bounds, and public location formatting. Real Postgres, R2, Google OAuth, and Resend flows still require staging integration checks with disposable accounts; do not point those checks at production data.
