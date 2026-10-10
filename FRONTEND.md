# CRITERIA frontend

This document describes the current React application. The server schema and route implementation are the source of truth when changing a contract. See DESIGN.md for the visual direction.

## Stack and entry points

- React 18, React Router 6, TypeScript, Vite 5, Tailwind 3 and CSS custom properties.
- Apollo Client uses GraphQL over HTTP for queries and mutations, and graphql-ws for chat subscriptions.
- The same frontend bundle runs in browsers and the Capacitor WebView. main.tsx adds a native or web class at runtime; CSS responds to viewport width on both.
- App.tsx owns route registration. lib/gql.ts owns GraphQL documents. lib/auth.ts owns access and refresh token operations. lib/native-auth.ts owns Capacitor Google OAuth return handling.
- lib/language.tsx supplies the `pt-PT` default and a saved English preference (`en-GB`); use `useLanguage().t(portuguese, english)` for interface copy and accessible labels.
- The server owns email/password accounts, Google OAuth, JWT issuance, GraphQL authorization and R2 upload signing. The current PostgreSQL host is Neon; the frontend does not use Supabase for authentication.

## Routes and roles

| Path | Purpose |
| --- | --- |
| / | Shared home for visitors and members; one search field toggles between Properties and Criteria |
| /sign-in, /sign-up | Email and Google entry points |
| /check-email, /verify-signup | Pending password registration and mailbox confirmation |
| /forgot-password, /reset-password | Email password recovery |
| /auth/callback | Google code exchange and account routing |
| /settings/verify-email, /settings/confirm-delete | Public, single-use account confirmation links sent by email |
| /privacy | Privacy Policy covering accounts, posts, providers and device storage |
| /terms | Terms of Use for accounts, posts, messages and service expectations |
| /onboarding | Age and role completion after Google sign-in |
| /feed | Public, property-only search results with filters and list/map views |
| /requests | Protected Criteria results for sellers and both-role members, with filters and list/map views; buyer-only members see role guidance |
| /create | Create a property or criteria post permitted by role; `?type=criteria` preselects criteria for eligible accounts |
| /inbox | Conversations and messages |
| /profile | Identity, role and owned posts |
| /settings | Name, profile photo, account access, appearance, language, deletion and an About Criteria tab with documents and contact |
| /listing/:id | Public active-property detail; owner can also view an inactive property |
| /criteria/:id | Protected criteria detail for its owner or an eligible seller |
| /listing/:id/edit, /criteria/:id/edit | Owner editing |

Home, property results and active-property details are available without signing in. ProtectedRoute handles signed-out navigation on account, posting, criteria and messaging routes; the OnboardingGate in App.tsx handles incomplete onboarding there. The internal return destination is preserved when a protected direct link sends a user through sign-in or onboarding. Buyers publish criteria; sellers discover criteria and publish properties; both-role users can do both. Owners can manage their inactive posts from Profile. The backend enforces the same data permissions; hiding a tab alone is never an access check.

## Authentication

Email signup sends email, password, name, role and integer age to the server. The server validates the 18–120 range and emails a 30-minute confirmation link without creating an active account or session. The user clicks the activation button on `/verify-signup`, which consumes the link and returns tokens. Profile photos can be added after activation. An existing password account is not automatically linked to Google by email alone.

Google OAuth starts at the server. The browser or native WebView stores a random one-use client verifier in session storage and sends its SHA-256 challenge when starting sign-in. The server redirects only to its configured web callback or the registered native scheme, with a single-use code. The frontend removes the code from browser history and exchanges it with the verifier through POST /auth/google/exchange, then checks the user's onboardingComplete field. New Google users complete age and role before entering protected routes; successful authentication defaults to Home. iOS uses the OAuthBridge ASWebAuthenticationSession plugin; Android uses a Custom Tab and appUrlOpen. Neither callback puts access or refresh tokens in the URL.

For live local Google sign-in, start the API with `pnpm --filter server dev` and apply all migrations, including `0006`, with `pnpm --filter server db:migrate`. When `FRONTEND_URL` is an HTTP loopback address, the web callback follows the frontend origin in the address bar: development accepts either `localhost` or `127.0.0.1` on the configured frontend port. Register the API callback on the Google OAuth web client: `${PUBLIC_API_URL}/auth/google/callback` when `PUBLIC_API_URL` is set, or `http://localhost:4000/auth/google/callback` by default (adjust for `PORT`). A Google `redirect_uri_mismatch` error means that URI is absent or differs; the frontend's `/auth/callback` and the native deep link are not Google authorized redirect URIs. Review mode's Google button exits the isolated mock session through a full reload at `/sign-in?review=0`, then starts live sign-in. If the local API is unavailable, the sign-in page reports that instead of opening a failed OAuth page.

The access token is attached to GraphQL HTTP and WebSocket requests. lib/auth.ts rejects expired access tokens and refreshes them through POST /auth/refresh. useAuth rechecks when a page becomes visible and while it remains open. Sign-out calls the server and clears local credentials. Password reset uses the server's request/confirm endpoints; production email delivery depends on the configured sender. Settings uses GraphQL for the public profile name and owned avatar; password, email and deletion use authenticated REST requests and one-use email links. A password or completed email change signs out every device. Confirmation routes are public so links can open in an ordinary browser, including when the user started from the Capacitor app.

## Discovery and posts

Home puts a Properties/Criteria toggle and one location/keyword search over an edge-to-edge property photograph. A near-solid forest scrim protects the controls on phones while leaving the upper photo visible; on desktop, the scrim runs left to right so the room remains visible beside the search. Sand controls and restrained clay selected-state details provide contrast without a floating search card. Home contains no post cards. The selected mode is reflected in `?mode=requests` so returning from results restores the choice. Its autocomplete contains all 18 mainland districts, two autonomous regions and 308 municipalities; matching ignores accents and runs from a local index without a geocoding request. In Properties mode, submitting a selected place writes `district` and, for a municipality, `municipality` to `/feed`; free text writes `q`. An empty search opens all active properties. In Criteria mode, the entered place or keyword opens `/requests?q=…`; an empty search opens all eligible criteria. On phones, Home ends after the photo-backed search; its secondary location shortcuts, criteria invitation, FAQ and footer are hidden. Desktop retains compact district/region shortcuts with an expandable directory and the criteria publishing CTA. Guests who follow a criteria link return there after sign-in and onboarding; buyer-only members see how to add a seller role. The property and criteria result pages each keep search, filters, sort, view, page and map bounds in the URL. `sellerPostSearch` and `buyerPostSearch` return `items`, `totalCount` and `hasNextPage`; list and map use the same state. An active property detail is public, and its back path returns to saved results or a safe results fallback. Criteria discovery remains available only to completed seller/both accounts, while buyers retain access to their own criteria details from Profile. Criteria posts never appear in public property results. Stored precise post coordinates are for server-side matching; public GraphQL locations are deliberately coarse. Address lookup in post forms sends text to the configured Nominatim endpoint only when the user presses Find or Enter; typing alone makes no lookup requests. Public Nominatim has an aggregate per-app limit, so production growth requires a permitted provider or a server proxy with shared throttling and caching.

Property and criteria forms share section and validation patterns. Property photos are JPEG, PNG or WebP, up to 10 MB each and 12 files. The upload client requests a presigned URL in the authenticated user's avatars/ or posts/ namespace, then PUTs the file to R2. Profile keeps active and archived owner posts; Inbox uses conversation queries and message subscriptions.

## Design foundation

Edit semantic HSL variables, shape tokens and shadows in src/index.css. tailwind.config.ts maps them to utilities. src/design-basis.css contains reusable layout, type and surface classes. The palette retains forest green and sand, with warm paper, white surfaces, and a restrained clay accent. Controls use 4px corners, cards 6px and panels 8px; photography is nearly square, while avatars remain circular. Dark mode changes the same semantic variables rather than adding a second component palette. The visible theme control offers Light, Dark and System; useTheme persists the preference and follows OS changes, while an index.html bootstrap applies it before React renders. Self-hosted IBM Plex Sans Variable is used across body, headings and prices.

Signed-in members use three bottom tabs: Home, Create and Inbox. Criteria remain reachable through Home search, while seller and both-role members also see a Criteria link in the desktop top navigation. The top brand header links home and exposes Profile. Tablets and desktops use one role-aware top navigation bar and the top-right name/avatar for Profile. Guests have account actions rather than member tabs. Settings holds the Light, Dark and System theme control. The language switch sits in the desktop browser header; on phone layouts and in the native app it is in Settings. The saved language preference defaults to European Portuguese and updates the document language. Phone Settings separates account controls from an **About Criteria** tab containing Privacy Policy, Terms and contact email; desktop Settings presents those sections together. Home leads to both discovery routes; further search and filters live on their results pages as temporary controls, without a permanent app rail. The shell expands at 768px on both web and native. Content has readable width while maps and image layouts use available space. Safe-area insets, keyboard focus, reduced motion and clear loading/empty/error states are part of component behavior.

The browser shows a privacy and storage notice; Settings can reopen it. Without a Cloudflare site token it only explains necessary storage. When `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN` is configured, the real production browser site offers equally visible Essential only and Allow analytics choices; the Cloudflare beacon loads only after recorded opt-in. Withdrawing consent reloads the page to stop a previously loaded beacon. The token is public site configuration, not a secret. The beacon is excluded from the Capacitor WebView, local development, preview hosts, review mode, and single-use auth/account confirmation routes. Cloudflare's `spa:false` setting disables automatic route-change tracking; the integration measures initial page loads and performance only. Disable any hosting or Cloudflare automatic analytics injection, which would bypass the app's choice. Sign-in tokens, theme and language preferences use local storage; return navigation and property-results scroll position use session storage. IBM Plex Sans Variable is served locally, with Latin and extended subsets and its OFL notice in public/fonts/. The public Privacy Policy and Terms of Use are substantive drafts, kept out of search indexing pending the operator and legal checks in `LEGAL_REVIEW.md`.

Prefer existing local CVA components in components/ui for buttons, inputs and labels. Add accessible behavior to those components or small focused primitives rather than introducing a separate themed component library.

## Safe local review mode

Run the Vite development server, then open a route with ?review=1, for example /?review=1. A review control appears on every page. It can switch buyer, seller and both roles, and populated, empty, error, slow, incomplete-onboarding and signed-out scenarios. It links directly to public, protected, owned, other-owner and archived routes. Synthetic properties cover all 18 mainland districts and both autonomous regions with correctly paired municipalities, so location and keyword search can be reviewed across Portugal. Changes in a scenario live only in memory and reset on reload. Exit review with the control or ?review=0.

Review mode is explicitly opted in and additionally guarded by import.meta.env.DEV. The production build cannot activate it. Its auth identity uses a local sentinel instead of the real token storage keys. Apollo uses an in-memory link that fails visibly on unknown operations; signup, sign-in, uploads, geocoding and warmup use local adapters. A development fetch guard blocks non-read requests and configured backend URLs. Illustrative property images are local development assets. Map tiles may still make read-only requests to the map provider.

Use review mode for route, role, ownership, loading and error inspection without real credentials or backend writes. The Google button deliberately leaves review mode before contacting the live API; it needs the API and a migrated database. Use disposable staging accounts for final authentication, email, upload, chat and API integration checks.

## Environment and commands

Copy frontend/.env.example to frontend/.env for live local development. Set VITE_API_URL, VITE_GRAPHQL_URL and VITE_GRAPHQL_WS_URL to the same server deployment. Review mode can start without those values, but normal mode requires them.

Production builds reject mixed-content API configuration: `pnpm --filter frontend build` requires an `https://` VITE_API_URL and VITE_GRAPHQL_URL plus a `wss://` VITE_GRAPHQL_WS_URL. Local development can use `http://` and `ws://`.

VITE_MAP_TILE_URL and VITE_MAP_TILE_ATTRIBUTION select the map tile provider and its visible credit. The example uses OpenStreetMap tiles for local development. Configure an appropriate provider and its required attribution for every production deployment; both values are embedded in the frontend bundle at build time.

VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN is optional and must come from the site's Cloudflare Web Analytics dashboard. Leave it unset until the live deployment has been checked for automatic script injection and the consent flow has been verified. This integration measures initial browser page loads and performance, not SPA route changes or custom button events; it cannot serve as sign-up conversion tracking.

~~~bash
pnpm install
pnpm --filter frontend dev --host
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend test
pnpm --filter frontend build
~~~

The frontend CI workflows run typecheck, lint and Vitest when frontend files or the lockfile change.
