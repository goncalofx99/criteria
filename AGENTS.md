# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Repository layout

The pnpm workspace (`pnpm-workspace.yaml`) includes two packages; `mobile/` is a separate Capacitor package:

- `frontend/` — React + Vite SPA (also wrapped by Capacitor for iOS/Android)
- `server/` — Hono + Apollo GraphQL API, Drizzle ORM on PostgreSQL (currently Neon)
- `mobile/` — Capacitor 7 native shell. **No business logic** — a WebView pointing at the deployed (or LAN-served) frontend, plus an iOS OAuth plugin. Run Capacitor commands from `mobile/`, not with `pnpm --filter mobile`.

The frontend and mobile share the same JS bundle: native-vs-browser branching is done at runtime via `Capacitor.isNativePlatform()`.

## Common commands

Run from the repo root unless noted.

```bash
pnpm install                            # install frontend and server workspaces
pnpm dev                                # frontend (5173) + server (4000) concurrently
pnpm typecheck                          # tsc on every workspace
pnpm lint                               # eslint on every workspace
pnpm test                               # vitest on every workspace
pnpm build                              # frontend production build + server tsc

# Workspace-scoped
pnpm --filter frontend dev              # vite dev server
pnpm --filter frontend dev --host       # listen on LAN (needed for mobile dev — see MOBILE.md)
pnpm --filter frontend typecheck
pnpm --filter frontend build

pnpm --filter server dev                # tsx watch
pnpm --filter server test               # vitest
pnpm --filter server test -- foo.test   # single test file
pnpm --filter server db:generate        # drizzle-kit generate from schema.ts
pnpm --filter server db:migrate         # apply migrations to DATABASE_URL/MIGRATION_URL
pnpm --filter server db:studio          # drizzle studio

# Native shell
cd mobile
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync
```

CI runs `typecheck`, `lint`, and `test` per-workspace, scoped by `dorny/paths-filter` so frontend changes don't trigger server jobs and vice versa.

## Environment

`server/.env` requires `DATABASE_URL`, a 32+ character `JWT_SECRET`, Google OAuth credentials, and R2 credentials. `MIGRATION_URL` is a separate direct PostgreSQL connection for Drizzle DDL. `FRONTEND_URL` is required in production for CORS and OAuth redirect allowlisting. Password recovery also needs `RESEND_API_KEY` and a verified `PASSWORD_RESET_FROM` sender. See `server/.env.example`.

`frontend/.env` uses `VITE_API_URL`, `VITE_GRAPHQL_URL`, and `VITE_GRAPHQL_WS_URL`. Optional `VITE_MAP_TILE_URL` and `VITE_MAP_TILE_ATTRIBUTION` configure map tiles. See `frontend/.env.example`.

The server validates env on startup via Zod and exits immediately if anything's missing — see `server/src/lib/env.ts`.

## Architecture

### The bidirectional data model

The product premise: **both sides of the market post**. Sellers post property listings (`sellerPosts`); buyers post criteria visible to eligible sellers (`buyerPosts`). Matching is symmetric — `matchingBuyerPosts(sellerPostId)` and `matchingSellerPosts(buyerPostId)` both exist and run a Haversine-distance + range-overlap query (see `server/src/schema/resolvers/matching.ts`).

Schema lives in [server/src/db/schema.ts](server/src/db/schema.ts). The buyer- and seller-post tables are intentionally **mirror-symmetric** on the matchable fields:
- `sellerPost.price` ↔ `buyerPost.priceMin/priceMax`
- `sellerPost.bedrooms` ↔ `buyerPost.bedroomsMin`
- `sellerPost.areaSqm` (nullable) ↔ `buyerPost.areaSqmMin` (nullable)
- both store `lat/lng`; buyers add `radiusKm`

Anything that breaks that symmetry (e.g. adding a field to one side) needs to be reflected on the other side or matching becomes lossy.

`User.role` is `buyer | seller | both`. The frontend hides/shows surfaces based on it (e.g. buyers can post criteria but not browse other criteria; sellers do the inverse). The role check helper is `frontend/src/hooks/useMe.ts` (`canViewCriteria`, `canCreateProperty`, `canCreateCriteria`).

### Auth

The CRITERIA server owns email/password accounts, Google OAuth, JWT access tokens, and rotating refresh tokens. Supabase is not used for frontend authentication. The Apollo client attaches the access token as `Authorization: Bearer …` on HTTP and in WebSocket connection parameters.

Server-side, `authMiddleware` populates `c.set('userId', …)` when a valid token is present. Resolvers enforce authentication, completed onboarding, role and ownership as applicable. Post discovery requires authentication; buyer-request discovery requires a seller/both role. Use the existing resolver checks as templates.

Email signup creates a user and completes onboarding. Google OAuth creates a user with `onboardingComplete: false`; onboarding collects age and role, then `upsertUser` completes it. The app gate redirects incomplete users before rendering protected screens. Never use the local review fixture path as a production auth bypass.

### Frontend structure

- `src/routes/*` — landing, authentication/recovery, onboarding, Explore, Create, detail/edit, Inbox, and Profile screens.
- `src/components/layout/AppLayout.tsx` + `BottomNav.tsx` — one top navigation at tablet/desktop widths and a four-tab safe-area bottom navigation on phones. Protected routes and onboarding gate live in `App.tsx`.
- `src/components/posts/{PropertyCard,CriteriaCard}.tsx` — the two card primitives the feed and profile reuse.
- `src/components/ui/*` — primitive UI (button, input, label, textarea) styled with the design tokens in `src/index.css`.
- `src/lib/gql.ts` — every GraphQL document used by the app, with shared fragments. **Add new operations here**, not inline in components.
- `src/lib/{format,locations,propertyType}.ts` — display helpers and the four canonical property-type enum values (`apartment | house | land | commercial`) that mirror the server's Drizzle enum.
- `src/lib/{apollo,auth,native-auth}.ts` — client/auth setup. `apollo.ts` splits subscriptions onto a graphql-ws link and HTTP everywhere else.
- `src/hooks/{useAuth,useMe}.ts` — `useAuth` reads CRITERIA's token session; `useMe` reads GraphQL `me` and role-derived capabilities. Use the right one: `useAuth` for "is logged in?", `useMe` for "what can this user do?".
- `src/review/*` — explicit `?review=1` development-only, in-memory fixtures and transport. Keep its `import.meta.env.DEV` gate and network isolation; production bundles must exclude it.

### Design tokens

Colors and shadows live as CSS custom properties in `frontend/src/index.css` and are mapped to Tailwind classes in `frontend/tailwind.config.ts`. **Edit the CSS variables, not the Tailwind config**, to change the look — the config just references the variables.

Key brand tokens: primary green `#344e41`, accent sand `#f5f0e8`. The `app-shell` utility constrains phone layouts to a 480px column and expands at 768px+ on both web and native. See `DESIGN.md` for the responsive and content system.

### Mobile (Capacitor)

See `MOBILE.md` for the full guide. The two things easy to miss:

1. **Dev URL**: `mobile/dev.config.json` (gitignored) holds your LAN URL. iOS starts in the bundled launcher and can switch PROD/DEV at runtime; Android uses Capacitor `server.url` from that file or the production default.
2. **OAuth on iOS** uses a custom Capacitor plugin (`OAuthBridge.swift`) wrapping `ASWebAuthenticationSession`, because Google blocks OAuth in embedded WebViews. Android uses `@capacitor/browser` (Chrome Custom Tabs) + an intent-filter that delivers the redirect via `appUrlOpen`. Both return a short-lived single-use code, exchanged at the API; tokens never travel in the deep link. The JS dispatcher is `frontend/src/lib/native-auth.ts`; `<NativeAuthBridge />` is mounted in `App.tsx`.
3. After changing `dev.config.json`, `capacitor.config.ts`, or any native plugin: `cd mobile && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync` (the LANG vars work around CocoaPods locale issues).

## Reference docs in this repo

- `README.md` — project overview, tech stack, env setup
- `MOBILE.md` — Capacitor wrapper, OAuth bridges, dev workflow
- `BACKEND.md` and `FRONTEND.md` — longer-form architecture notes (consult these before large refactors)
