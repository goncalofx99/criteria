# CRITERIA backend reference

This document reflects the current Hono, Apollo, Drizzle and PostgreSQL implementation in `server/`. The GraphQL schema and resolvers in `server/src/schema/` are the source of truth for exact field types.

## Runtime and setup

Run `pnpm --filter server typecheck`, `pnpm --filter server lint`, and `pnpm --filter server test` from the repository root. Start the API with `pnpm --filter server dev`. The HTTP GraphQL endpoint is `/graphql`; `graphql-ws` subscriptions use the same path on WebSocket. `/health` returns a basic health response.

Copy `server/.env.example` to `server/.env` and provide a database URL, a JWT secret of at least 32 characters, Google OAuth credentials, and R2 credentials. `FRONTEND_URL` is required in production and must be the exact deployed frontend origin. Verified signup also requires `RESEND_API_KEY` and a verified `PASSWORD_RESET_FROM` sender in production. Use the direct `MIGRATION_URL` for DDL; the pooled `DATABASE_URL` is for normal requests. Apply migrations with `pnpm --filter server db:migrate` **before** deploying server code that reads new tables or testing live Google sign-in locally. Migration `0003` adds `users.onboarding_completed_at`; migration `0004` adds one-use password reset tokens; migration `0005` adds account-action tokens, account-deletion jobs and auth versions for access-token revocation; migration `0006` adds pending email signups. Existing password accounts are backfilled as onboarded; existing Google-only accounts must finish age and role onboarding.

`PUBLIC_API_URL` optionally sets the externally reachable API origin used for Google's callback. If unset, development uses `http://localhost:<PORT>` and production uses the existing Render API origin. Set it to the deployed API or an HTTPS tunnel when that origin differs; register the exact `${PUBLIC_API_URL}/auth/google/callback` URI in Google Cloud. This URL must route back to the same API process that started OAuth because its state and code verifier live in memory. For local physical-device development, tunnel to the local API or use a deployed API for the entire flow; pointing a local server at a different deployed API callback will lose its state. This is the API origin, separate from `FRONTEND_URL` and the native app callback.

Password recovery and the new email-change/deletion confirmation links require `RESEND_API_KEY` and a verified `PASSWORD_RESET_FROM` email address. Without them, request endpoints return 503. The service sends plain-text, short-lived links through Resend's HTTP API. Account deletion also needs the R2 token to have ListObjects and DeleteObjects permissions on the configured bucket; failed object removal remains queued for retry.

## Authentication

CRITERIA owns its user and session tables. Supabase is not used for the current auth flow. The API signs 15-minute JWT access tokens and rotates database-backed refresh tokens. Access tokens and refresh sessions capture an account auth version checked against the database, allowing password resets and completed account changes to revoke access immediately. Active chat subscriptions recheck it for each event. Send `Authorization: Bearer <accessToken>` on GraphQL and upload requests. For subscriptions, send the same value in `connectionParams.authorization` or `connectionParams.Authorization`.

| Endpoint | Request | Result |
|---|---|---|
| `POST /auth/signup` | `{email,password,fullName?,role?,age}` | `202 {pendingVerification:true}` and a 30-minute email link. No user or session is created until the mailbox owner confirms. `age` must be an integer from 18 to 120. |
| `POST /auth/signup/confirm` | `{token}` | Creates the verified account, completes onboarding, consumes the link once, and returns the user and tokens. |
| `POST /auth/signin` | `{email,password}` | User and new tokens. |
| `POST /auth/refresh` | `{refreshToken}` | Rotated access and refresh tokens. |
| `POST /auth/signout` | `{refreshToken}` | Revokes that refresh session. |
| `GET /auth/me` | Bearer token | Authenticated user. |
| `GET /auth/google?redirect=…&client_challenge=…` | Approved callback and SHA-256 client challenge | Starts Google OAuth. The callbacks are the configured `FRONTEND_URL/auth/callback` and `com.criteria.app://auth/callback`; development also accepts the equivalent `localhost` or `127.0.0.1` web callback on the same configured port. An arbitrary URL is rejected. |
| `GET /auth/google/callback` | Google code and state | Redirects to the approved callback with a short-lived **single-use exchange code**, never tokens. |
| `POST /auth/google/exchange` | `{code,clientVerifier}` | Access and refresh tokens only when the verifier matches the challenge supplied by the initiating client. The code expires after two minutes and is consumed once. |
| `POST /auth/password-reset/request` | `{email}` | Generic success for known and unknown addresses; rate limited to one token per user per minute. Sends a 30-minute link to `/reset-password?token=…`. |
| `POST /auth/password-reset/confirm` | `{token,password}` | Changes password, consumes all that user's reset tokens, and revokes all refresh sessions. |
| `POST /auth/account/password` | Bearer token, `{currentPassword,newPassword}` | Verifies the current password, changes it and revokes all access and refresh sessions. Google-only accounts use the verified email password-reset route to add a password. |
| `POST /auth/account/email/request` | Bearer token, `{email}` | Sends a one-use approval link to the current address. No address changes yet. |
| `POST /auth/account/email/confirm-current` | `{token}` | Consumes the current-address link and sends a one-use verification link to the proposed address. |
| `POST /auth/account/email/confirm-new` | `{token}` | Changes the account email, revokes all sessions and consumes pending account links. A linked Google identity remains linked. |
| `POST /auth/account/delete/request` | Bearer token, `{password?}` | Verifies the current password when one exists and emails a final one-use deletion link. |
| `POST /auth/account/delete/confirm` | `{token}` | Deletes account data in a transaction and queues removal of owned R2 avatar/post objects. |

Google OAuth creates a user with `onboardingComplete: false`. It resolves returning users by Google's stable subject ID and never links a password account merely because its email matches. Those users sign in with their password or recover it; previously auto-linked accounts need a separate ownership review. The frontend must route new Google users to onboarding and call `upsertUser(input: {role, age, fullName?, avatarUrl?})`. The resolver requires a role and age from 18 to 120 before setting the completion timestamp. Existing users can use `upsertUser` to change role, name or avatar. New avatar URLs must point to their own `avatars/<userId>/` R2 path; unchanged legacy or Google picture URLs remain usable. It cannot change account email. The age confirmation time is stored, not the supplied age. The private `me.hasPassword` field lets Settings distinguish password accounts from Google-only accounts.

Signup, account email and deletion links expire after 30 minutes and are stored only as hashes. A startup and 15-minute task removes expired signup, account-action and password-reset tokens. Email changes require approval at the current inbox and verification at the new inbox. Account deletion requires a final email link and, for password accounts, the current password when requesting that link. Deletion removes the user's rows and conversations in one database transaction, then retries owned R2 object cleanup from a durable job until it succeeds. Do not expose a deletion job to clients or remove its retry worker without replacing the erasure path.

OAuth state and exchange codes currently live in process memory. Deploying multiple API instances or restarting during OAuth may invalidate an in-progress sign-in; use a shared short-lived store before scaling horizontally. GraphQL WebSockets require a valid access token and an approved production Origin, accept subscriptions only, and cap sockets per account and per process. HTTP and WebSocket GraphQL operations share depth and field-count limits.

Register the exact API callback URI in Google Cloud: `${PUBLIC_API_URL}/auth/google/callback` when `PUBLIC_API_URL` is set, or the default API origin plus `/auth/google/callback` when it is unset. Google redirects to the API first; the API redirects to one of the approved frontend or native callbacks above. The development loopback hostname alias applies only to this final web callback and only for a non-production HTTP loopback `FRONTEND_URL`; it does not add a Google redirect URI or loosen production validation.

## GraphQL access and privacy

`me` returns `null` when signed out. Active property listings are public through `sellerPosts`, `sellerPostSearch` and `sellerPost(id)`, including to guests. Inactive properties remain visible only to their owner. A public property's `seller` field exposes only `id`, `fullName` and `avatarUrl` through `SellerProfile`; account fields such as email stay private. Buyer-request lists and search require a completed seller or both account; an owner can open and manage their own request. `mySellerPosts` and `myBuyerPosts` require authentication and include inactive posts for their owner. Inactive posts are excluded from discovery and matching and hidden from other users' direct detail links.

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

The existing `sellerPosts` and `buyerPosts` list fields remain for compatibility. The public property-results page uses the counted seller search; buyer search remains protected for eligible members:

```graphql
sellerPostSearch(
  limit: Int, offset: Int, filters: SellerPostFilters,
  search: String, district: String, municipality: String,
  bounds: MapBoundsInput, sort: SellerPostSort
): SellerPostSearchResult!

buyerPostSearch(
  limit: Int, offset: Int, filters: BuyerPostFilters,
  search: String, bounds: MapBoundsInput, sort: BuyerPostSort
): BuyerPostSearchResult!
```

Both results contain `items`, `totalCount`, and `hasNextPage`. The default limit is 20, the maximum is 200, and the default sort is newest first. A negative offset or invalid filter/map range yields `BAD_USER_INPUT`. For properties, `search` finds literal text in the title and description, plus exact known public locality segments, up to 120 characters. `district` accepts a mainland district or autonomous region; `municipality` accepts a Portuguese municipality and may be paired with its district or region. Unknown names or an invalid pairing yield `BAD_USER_INPUT`. The API validates selections against the same 18 districts, two autonomous regions and 308 municipalities available on the home search. The stored `locationText` is still a free-form geocoder label, so administrative filtering matches recognized complete comma-delimited location segments rather than a stored municipality ID. `bounds` contains `north`, `south`, `east`, `west` floats; crossing the antimeridian is supported. Counts and items use the same active-post filters.

Seller sorts: `newest`, `oldest`, `price_asc`, `price_desc`, `area_asc`, `area_desc`, `price_per_sqm_asc`, `price_per_sqm_desc`. Buyer sorts: `newest`, `oldest`, `budget_asc`, `budget_desc` (budget sorts by `priceMax`). Sorting has stable created-at and ID tie-breakers. Area and price-per-area sorts place missing areas last.

Posts can be archived with `deactivateSellerPost(id)` or `deactivateBuyerPost(id)` and restored with `reactivateSellerPost(id)` or `reactivateBuyerPost(id)`. Owners can edit archived posts before republishing. Property types `land` and `commercial` may omit residential fields; the server defaults bedroom and bathroom counts to zero, leaves area and year built null, and uses neutral condition/amenity defaults. Apartment and house creation still requires bedroom, bathroom, area, year, condition, balcony and heating answers. Clearable optional fields accept explicit `null` in create/update GraphQL input.

For matches, both directions use the same price, type, minimum size/specs, distance, condition, floor, and amenity semantics. A missing seller value does not satisfy a buyer's required minimum. Buyer radius is validated up to 500 km. Matching is limited to active posts and excludes the current user's own opposite-side posts.

## Messaging and uploads

`startConversation(input: {sellerPostId})` starts or returns an existing buyer-to-seller conversation. `startConversation(input: {buyerPostId})` does the same for seller-to-buyer contact. `myConversations`, `conversation(id)`, `sendMessage`, and `messageSent` require participant access. Conversation messages resolve oldest first for reading. Inactive posts cannot start new conversations.

The API has a broad per-IP request limit plus narrower limits for sign-up, sign-in, and password-reset requests. Message sending has a per-account burst limit. On Render, the limiter uses the Cloudflare edge's client-IP header rather than the caller-controlled first `X-Forwarded-For` value. These counters live in the single API process and are a first line of spam protection, not a distributed anti-abuse service. Move them to a shared store and add a managed challenge or moderation workflow before running multiple API instances or accepting significant public traffic. Expired refresh sessions and one-use account links are removed during periodic account maintenance. Production startup rejects HTTP frontend and R2 media URLs; Render and Vercel enforce HTTP-to-HTTPS at their edges.

`POST /upload/presign` requires a bearer token and accepts `{key,contentType}` for JPEG, PNG, WebP or GIF. Keys must be `avatars/<ownUserId>/<safeFilename>` or `posts/<ownUserId>/<safeFilename>` with a matching image extension and content type. The response provides a five-minute R2 PUT URL and a public URL. The browser resizes images to at most 2000px and re-encodes them before upload, removing camera metadata such as embedded GPS coordinates. The browser uploads the prepared bytes directly to R2. The API does not inspect uploaded bytes or enforce file size at this endpoint, so a separate server-side image pipeline is needed before metadata removal and size limits can be guaranteed for every client.

New listing image URLs must point to the owner's `posts/<userId>/` path on the configured R2 public host. Existing external image URLs can stay on an edited legacy listing, but cannot be added again after removal. Public post coordinates are rounded to about neighbourhood scale. Public location labels use recognized Portuguese municipalities, districts and autonomous regions; unknown places display “Portugal” or “Approximate area”. Search matches arbitrary text in titles/descriptions, and only recognized locality names against complete stored address segments. Since stored geocoder text has no normalized administrative IDs, a listing whose label omits its municipality and district may be missed by a structured location search. Add structured locality fields from geocoding to make geographic filtering fully reliable without exposing street names or mistaking a district for its city.

## Errors and verification

Expected GraphQL error codes are `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, and `BAD_USER_INPUT`. Production masks unexpected internal errors. The server test suite covers schema construction, input validation, OAuth redirect allowlisting, search bounds, and public location formatting. Real Postgres, R2, Google OAuth, and Resend flows still require staging integration checks with disposable accounts; do not point those checks at production data.
