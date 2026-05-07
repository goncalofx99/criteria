# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

pnpm workspace with three packages:

- `frontend/` — React + Vite SPA (also wrapped by Capacitor for iOS/Android)
- `server/` — Hono + Apollo GraphQL API, Drizzle ORM on Supabase Postgres
- `mobile/` — Capacitor 7 native shell. **No business logic** — it's a WebView pointing at the deployed (or LAN-served) frontend, plus a small native plugin for iOS OAuth.

The frontend and mobile share the same JS bundle: native-vs-browser branching is done at runtime via `Capacitor.isNativePlatform()`.

## Common commands

Run from the repo root unless noted.

```bash
pnpm install                            # install all workspaces
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
```

CI runs `typecheck`, `lint`, and `test` per-workspace, scoped by `dorny/paths-filter` so frontend changes don't trigger server jobs and vice versa.

## Environment

`server/.env` requires `DATABASE_URL` and `SUPABASE_URL`. `SUPABASE_JWT_SECRET` is optional — if unset, the server verifies JWTs against Supabase's JWKS endpoint (modern ECC keys); if set, it forces HS256 verification (useful for tests). `MIGRATION_URL` is a separate direct connection used by drizzle-kit (Supabase's transaction pooler doesn't support DDL).

`frontend/.env` requires `VITE_GRAPHQL_URL`, `VITE_GRAPHQL_WS_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

The server validates env on startup via Zod and exits immediately if anything's missing — see `server/src/lib/env.ts`.

## Architecture

### The bidirectional data model

The product premise: **both sides of the market post**. Sellers post property listings (`sellerPosts`); buyers post their criteria publicly (`buyerPosts`). Matching is symmetric — `matchingBuyerPosts(sellerPostId)` and `matchingSellerPosts(buyerPostId)` both exist and run a Haversine-distance + range-overlap query (see `server/src/schema/resolvers/matching.ts`).

Schema lives in [server/src/db/schema.ts](server/src/db/schema.ts). The buyer- and seller-post tables are intentionally **mirror-symmetric** on the matchable fields:
- `sellerPost.price` ↔ `buyerPost.priceMin/priceMax`
- `sellerPost.bedrooms` ↔ `buyerPost.bedroomsMin`
- `sellerPost.areaSqm` (nullable) ↔ `buyerPost.areaSqmMin` (nullable)
- both store `lat/lng`; buyers add `radiusKm`

Anything that breaks that symmetry (e.g. adding a field to one side) needs to be reflected on the other side or matching becomes lossy.

`User.role` is `buyer | seller | both`. The frontend hides/shows surfaces based on it (e.g. buyers can post criteria but not browse other criteria; sellers do the inverse). The role check helper is `frontend/src/hooks/useMe.ts` (`canViewCriteria`, `canCreateProperty`, `canCreateCriteria`).

### Auth

Supabase issues the JWT (Google OAuth + email/password). The Apollo client attaches it as `Authorization: Bearer …` on HTTP and as `connectionParams.authorization` on the WebSocket link.

Server-side, `authMiddleware` populates `c.set('userId', …)` for every request. **Resolvers throw `UNAUTHENTICATED` themselves** — the middleware never rejects unauthenticated requests, because public queries (`sellerPosts`, `buyerPosts`) need to work without a token. Use the `requireAuth(ctx)` pattern from any post-resolver as the template.

User rows in our DB are populated lazily by the `upsertUser` mutation, which the frontend calls right after sign-in/sign-up. `me` returns null until that runs.

### Frontend structure

- `src/routes/*` — route components (`LandingPage`, `SignInPage`, `SignUpPage`, `Onboarding`, `AuthCallback`, `FeedPage`, `CreatePostPage`, `ProfilePage`).
- `src/components/layout/AppLayout.tsx` + `BottomNav.tsx` — the authenticated mobile-shell with a 3-tab bottom nav (Feed / Create / Profile). Wraps protected routes in `App.tsx`.
- `src/components/posts/{PropertyCard,CriteriaCard}.tsx` — the two card primitives the feed and profile reuse.
- `src/components/ui/*` — primitive UI (button, input, label, textarea) styled with the design tokens in `src/index.css`.
- `src/lib/gql.ts` — every GraphQL document used by the app, with shared fragments. **Add new operations here**, not inline in components.
- `src/lib/{format,locations,propertyType}.ts` — display helpers and the four canonical property-type enum values (`apartment | house | land | commercial`) that mirror the server's Drizzle enum.
- `src/lib/{apollo,supabase,native-auth}.ts` — client setup. `apollo.ts` splits subscriptions onto a graphql-ws link and HTTP everywhere else.
- `src/hooks/{useAuth,useMe}.ts` — `useAuth` reads the Supabase session, `useMe` reads the GraphQL `me` user (with role-derived booleans). Use the right one: `useAuth` for "is logged in?", `useMe` for "what can this user do?".

### Design tokens

Colors and shadows live as CSS custom properties in `frontend/src/index.css` and are mapped to Tailwind classes in `frontend/tailwind.config.ts`. **Edit the CSS variables, not the Tailwind config**, to change the look — the config just references the variables.

Key brand tokens: primary green `#344e41`, accent sand `#f5f0e8`. The `app-shell` utility constrains the layout to a 480px column on native + narrow web, and goes full-width on `md+` web (handled via the `html.web` class set in `main.tsx`).

### Mobile (Capacitor)

See `MOBILE.md` for the full guide. The two things easy to miss:

1. **Dev URL**: `mobile/dev.config.json` (gitignored) holds your LAN URL. Capacitor loads it directly into the WebView. When it doesn't exist, Capacitor falls back to the bundled launcher in `mobile/launcher/`.
2. **OAuth on iOS** uses a custom Capacitor plugin (`OAuthBridge.swift`) wrapping `ASWebAuthenticationSession`, because Google blocks OAuth in embedded WebViews. Android uses `@capacitor/browser` (Chrome Custom Tabs) + an intent-filter that delivers the redirect via `appUrlOpen`. The JS-side dispatcher is `frontend/src/lib/native-auth.ts`; the deep-link listener is mounted by `<NativeAuthBridge />` in `App.tsx`.
3. After changing `dev.config.json`, `capacitor.config.ts`, or any native plugin: `cd mobile && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync` (the LANG vars work around CocoaPods locale issues).

## Reference docs in this repo

- `README.md` — project overview, tech stack, env setup
- `MOBILE.md` — Capacitor wrapper, OAuth bridges, dev workflow
- `BACKEND.md` and `FRONTEND.md` — longer-form architecture notes (consult these before large refactors)
