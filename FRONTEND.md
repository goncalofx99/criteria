# CRITERIA frontend

This document describes the current React application. The server schema and route implementation are the source of truth when changing a contract. See DESIGN.md for the visual direction.

## Stack and entry points

- React 18, React Router 6, TypeScript, Vite 5, Tailwind 3 and CSS custom properties.
- Apollo Client uses GraphQL over HTTP for queries and mutations, and graphql-ws for chat subscriptions.
- The same frontend bundle runs in browsers and the Capacitor WebView. main.tsx adds a native or web class at runtime; CSS responds to viewport width on both.
- App.tsx owns route registration. lib/gql.ts owns GraphQL documents. lib/auth.ts owns access and refresh token operations. lib/native-auth.ts owns Capacitor Google OAuth return handling.
- The server owns email/password accounts, Google OAuth, JWT issuance, GraphQL authorization and R2 upload signing. Supabase is a PostgreSQL host, not the frontend auth client.

## Routes and roles

| Path | Purpose |
| --- | --- |
| / | Landing |
| /sign-in, /sign-up | Email and Google entry points |
| /forgot-password, /reset-password | Email password recovery |
| /auth/callback | Google code exchange and account routing |
| /onboarding | Age and role completion after Google sign-in |
| /feed | Explore properties, and buyer requests for seller/both users |
| /create | Create a property or buyer request permitted by role |
| /inbox | Conversations and messages |
| /profile | Identity, role and owned posts |
| /listing/:id, /criteria/:id | Property and buyer-request details |
| /listing/:id/edit, /criteria/:id/edit | Owner editing |

ProtectedRoute handles signed-out navigation; the OnboardingGate in App.tsx handles incomplete onboarding. The internal return destination is preserved when a protected direct link sends a user through sign-in or onboarding. Buyers browse properties and publish buyer requests. Sellers browse properties and buyer requests and publish properties. Both-role users can do both. Owners can manage their inactive posts from Profile. The backend enforces the same data permissions; hiding a tab alone is never an access check.

## Authentication

Email signup sends email, password, name, role and integer age to the server. The server validates the 18–120 range and returns short-lived access and refresh tokens. The optional avatar upload follows account creation; a failed upload does not turn a successful registration into a signup failure.

Google OAuth starts at the server. The server redirects only to its configured web callback or the registered native scheme, with a single-use code. The frontend exchanges the code through POST /auth/google/exchange, removes it from browser history, then checks the user's onboardingComplete field. New Google users complete age and role before Explore. iOS uses the OAuthBridge ASWebAuthenticationSession plugin; Android uses a Custom Tab and appUrlOpen. Neither callback puts access or refresh tokens in the URL.

The access token is attached to GraphQL HTTP and WebSocket requests. lib/auth.ts rejects expired access tokens and refreshes them through POST /auth/refresh. useAuth rechecks when a page becomes visible and while it remains open. Sign-out calls the server and clears local credentials. Password reset uses the server's request/confirm endpoints; production email delivery depends on the configured sender.

## Discovery and posts

Explore keeps result type, search text, filters, sort, view and page in the URL. sellerPostSearch and buyerPostSearch return items, totalCount and hasNextPage. List and map use the same query state. Direct details return to the saved results or to a safe fallback. Buyer requests are discoverable only by completed seller/both accounts and their owners. Stored precise post coordinates are for server-side matching; public GraphQL locations are deliberately coarse.

Property and request forms share section and validation patterns. Property photos are JPEG, PNG or WebP, up to 10 MB each and 12 files. The upload client requests a presigned URL in the authenticated user's avatars/ or posts/ namespace, then PUTs the file to R2. Profile keeps active and archived owner posts; Inbox uses conversation queries and message subscriptions.

## Design foundation

Edit semantic HSL variables and shadows in src/index.css. tailwind.config.ts maps them to utilities. src/design-basis.css contains reusable layout, type and surface classes. The palette retains forest green and sand, with warm paper, white surfaces, and a restrained clay accent. Dark mode changes the same semantic variables rather than adding a second component palette. The visible theme control offers Light, Dark and System; useTheme persists the preference and follows OS changes, while an index.html bootstrap applies it before React renders. DM Sans is used for headings and Inter for body text.

Phones use a three-item bottom navigation bar with Create centered; a persistent top brand header contains the CRITERIA logo, theme control and Profile link. Tablets and desktops use one top navigation bar with all four destinations. Search and filters belong to Explore and open as temporary controls; they do not create another permanent app rail. The shell expands at 768px on both web and native. Content has readable width while maps and image layouts use available space. Safe-area insets, keyboard focus, reduced motion and clear loading/empty/error states are part of component behavior.

Prefer existing local CVA components in components/ui for buttons, inputs and labels. Add accessible behavior to those components or small focused primitives rather than introducing a separate themed component library.

## Safe local review mode

Run the Vite development server, then open a route with ?review=1, for example /feed?review=1. A review control appears on every page. It can switch buyer, seller and both roles, and populated, empty, error, slow, incomplete-onboarding and signed-out scenarios. It links directly to public, protected, owned, other-owner and archived routes. Changes in a scenario live only in memory and reset on reload. Exit review with the control or ?review=0.

Review mode is explicitly opted in and additionally guarded by import.meta.env.DEV. The production build cannot activate it. Its auth identity uses a local sentinel instead of the real token storage keys. Apollo uses an in-memory link that fails visibly on unknown operations; signup, sign-in, uploads, geocoding and warmup use local adapters. A development fetch guard blocks non-read requests and configured backend URLs. Illustrative property images are embedded in fixtures. Map tiles may still make read-only requests to the map provider.

Use review mode for route, role, ownership, loading and error inspection without real credentials or backend writes. Use disposable staging accounts for final authentication, email, upload, chat and API integration checks.

## Environment and commands

Copy frontend/.env.example to frontend/.env for live local development. Set VITE_API_URL, VITE_GRAPHQL_URL and VITE_GRAPHQL_WS_URL to the same server deployment. Review mode can start without those values, but normal mode requires them.

VITE_MAP_TILE_URL and VITE_MAP_TILE_ATTRIBUTION select the map tile provider and its visible credit. The example uses OpenStreetMap tiles for local development. Configure an appropriate provider and its required attribution for every production deployment; both values are embedded in the frontend bundle at build time.

~~~bash
pnpm install
pnpm --filter frontend dev --host
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend test
pnpm --filter frontend build
~~~

The frontend CI workflows run typecheck, lint and Vitest when frontend files or the lockfile change.
