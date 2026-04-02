# CRITERIA

> A fully bidirectional real estate marketplace.

Most real estate platforms only let buyers search for sellers. **CRITERIA flips this on its head** — buyers can post what they're looking for, and sellers can browse a pool of active, qualified demand and reach out directly. Both the traditional model (sellers post, buyers browse) and the new model (buyers post, sellers browse) coexist in one platform.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Router v7 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| API client | Apollo Client (GraphQL) |
| Mobile | Capacitor (iOS + Android wrapper) |
| Server | Hono + Apollo Server |
| ORM | Drizzle ORM |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (Google OAuth) |
| Storage | Supabase Storage |
| Live chat | GraphQL Subscriptions (`graphql-ws`) |
| Package manager | pnpm |
| CI/CD | GitHub Actions |
| Web deploy | Vercel |
| Server deploy | Railway |

---

## Architecture

```
┌──────────────────────────────────────────────┐
│     Client (Browser / Capacitor shell)       │
│     React Router v7 + TypeScript             │
│     Apollo Client                            │
│       queries/mutations  ──► HTTP/GraphQL    │
│       subscriptions (chat) ► WebSocket       │
└──────────────────┬───────────────────────────┘
                   │
       ┌───────────▼───────────┐
       │  server/              │
       │  Hono + Apollo Server │
       │  Drizzle ORM          │
       └──────┬────────────────┘
              │
   ┌──────────┼──────────────┐
   │          │              │
┌──▼───┐ ┌───▼────┐ ┌───────▼──────┐
│  DB  │ │  Auth  │ │   Storage    │
│  PG  │ │ Google │ │   (images)   │
│Supa. │ │ OAuth  │ │    Supa.     │
└──────┘ └────────┘ └──────────────┘
```

---

## Repo Structure

```
CRITERIA/
├── frontend/          # React Router v7 web app
├── server/            # Hono + Apollo GraphQL API
├── mobile/            # Capacitor native iOS/Android wrapper
├── .github/workflows/ # GitHub Actions CI pipeline
├── package.json       # pnpm workspace root
└── pnpm-workspace.yaml
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `brew install supabase/tap/supabase`
- Xcode (for iOS builds, Mac only)
- Android Studio (for Android builds)

---

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/criteria.git
cd criteria

# 2. Install all dependencies
pnpm install

# 3. Set up environment variables
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
# Fill in your Supabase project URL, anon key, and JWT secret

# 4. Apply DB migrations
pnpm --filter server db:migrate

# 5. Start everything (frontend + server)
pnpm dev
```

This starts:
- **Frontend** at `http://localhost:5173`
- **GraphQL API** at `http://localhost:4000/graphql` (Apollo Sandbox available in dev)

---

## Environment Variables

### `server/.env`
```
DATABASE_URL=          # Supabase PostgreSQL connection string
SUPABASE_JWT_SECRET=   # Found in Supabase project settings → API
PORT=4000
```

### `frontend/.env`
```
VITE_GRAPHQL_URL=http://localhost:4000/graphql
VITE_SUPABASE_URL=     # Supabase project URL
VITE_SUPABASE_ANON_KEY= # Supabase anon/public key
```

---

## CI/CD

Every push and pull request runs:

```
typecheck → lint → test (Vitest) → build check
```

On merge to `main`:
- **Frontend** auto-deploys to Vercel
- **Server** auto-deploys to Railway

---

## Mobile Builds

```bash
# Build the web app first
pnpm --filter frontend build

# Sync into native projects
cd mobile && npx cap sync

# Run on simulator / device
npx cap run ios       # requires Xcode
npx cap run android   # requires Android Studio
```

---

## Environments

| | Local | Production |
|---|---|---|
| Frontend | `localhost:5173` | Vercel |
| Server | `localhost:4000` | Railway |
| Database | Supabase (dev project) | Supabase (prod project) |

---

## Contributing

- Branch naming: `feat/`, `fix/`, `chore/` (e.g. `feat/buyer-post-form`)
- Open a PR against `main` — CI must pass before merging
- One approval required for merge
