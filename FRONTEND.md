# CRITERIA — Frontend Reference

> Complete reference for the frontend app. Design tokens, auth flow, component patterns, and dev workflow.

---

## Table of Contents

1. [Stack](#1-stack)
2. [Project Structure](#2-project-structure)
3. [Design Tokens](#3-design-tokens)
4. [Component System](#4-component-system)
5. [Auth Flow](#5-auth-flow)
6. [GraphQL Client](#6-graphql-client)
7. [Route Map](#7-route-map)
8. [Dev Workflow](#8-dev-workflow)

---

## 1. Stack

| Layer | Technology |
|---|---|
| Bundler | [Vite 5](https://vitejs.dev/) |
| Framework | React 18 + TypeScript |
| Routing | React Router DOM v6 |
| Styling | Tailwind CSS v3 + CSS custom properties |
| Components | shadcn/ui pattern (CVA + Radix primitives) |
| API client | Apollo Client 3 (HTTP + WebSocket) |
| Auth | Supabase JS (`@supabase/supabase-js`) |
| Icons | Lucide React |

---

## 2. Project Structure

```
frontend/
├── index.html                  # Entry HTML — viewport, fonts, theme-color
├── vite.config.ts              # @ alias → ./src
├── tailwind.config.ts          # Design token extensions
├── src/
│   ├── main.tsx                # ApolloProvider → App
│   ├── App.tsx                 # Route definitions
│   ├── index.css               # CSS custom properties + Tailwind base
│   ├── lib/
│   │   ├── apollo.ts           # Apollo Client (HTTP + WS split link)
│   │   ├── gql.ts              # GraphQL operations
│   │   ├── supabase.ts         # Supabase client
│   │   └── utils.ts            # cn() helper (clsx + tailwind-merge)
│   ├── hooks/
│   │   └── useAuth.ts          # Session state hook
│   ├── components/
│   │   ├── ui/                 # Base components (Button, Input, Label)
│   │   ├── auth/               # Auth-specific (StepIndicator, PasswordStrength)
│   │   └── layout/             # ProtectedRoute
│   └── routes/                 # One file per page
│       ├── LandingPage.tsx
│       ├── SignInPage.tsx
│       ├── SignUpPage.tsx
│       ├── AuthCallback.tsx
│       ├── CheckEmail.tsx
│       ├── Onboarding.tsx
│       └── Feed.tsx            # (stub — Phase 2)
```

---

## 3. Design Tokens

All tokens are CSS custom properties defined in `src/index.css` and consumed via Tailwind. Use the Tailwind class — never raw HSL values in components.

### Colors

| Token | Tailwind class | Hex | Usage |
|---|---|---|---|
| `--primary` | `bg-primary` | `#344e41` | Brand green — CTAs, active states |
| `--primary-700` | `bg-primary-700` | `#2d4438` | Hover on primary |
| `--primary-600` | `bg-primary-600` | `#52796f` | Secondary green |
| `--primary-400` | `bg-primary-400` | `#84a98c` | Muted green, icons |
| `--primary-200` | `bg-primary-200` | `#cad2c5` | Dividers on dark |
| `--primary-100` | `bg-primary-100` | `#e8ede6` | Tinted backgrounds |
| `--accent` | `bg-accent` | `#f5f0e8` | Sand — secondary buttons, cards |
| `--accent-dark` | `bg-accent-dark` | `#e8e0d0` | Hover on accent |
| `--background` | `bg-background` | `#fafaf8` | Page background |
| `--surface` | `bg-surface` | `#ffffff` | Cards, modals |
| `--foreground` | `text-foreground` | `#1a1a1a` | Body text |
| `--muted-foreground` | `text-muted-foreground` | `#6b7280` | Placeholders, hints |
| `--border` | `border-border` | `#e5e7eb` | Default borders |
| `--border-strong` | `border-border-strong` | `#d1d5db` | Emphasis borders |
| `--destructive` | `text-destructive` | `#ef4444` | Errors |
| `--success` | `text-success` | `#22c55e` | Confirmations |
| `--warning` | `text-warning` | `#f59e0b` | Warnings |

### Typography

Defined in `tailwind.config.ts`:

| Class | Size | Line height |
|---|---|---|
| `text-2xs` | 10px | 1.4 |
| `text-xs` | 12px | 1.5 |
| `text-sm` | 14px | 1.5 |
| `text-base` | 16px | 1.6 |
| `text-lg` | 18px | 1.5 |
| `text-xl` | 20px | 1.4 |
| `text-2xl` | 24px | 1.3 |
| `text-3xl` | 30px | 1.2 |
| `text-display` | 36px | 1.1 |

Font: **Inter** (Google Fonts, 400/500/600/700).

### Spacing & Borders

| Class | Value |
|---|---|
| `rounded-xs` | 4px |
| `rounded-sm` | 6px |
| `rounded` / `rounded-md` | 8px |
| `rounded-lg` | 12px |
| `rounded-xl` | 16px |
| `rounded-2xl` | 20px |
| `max-w-app` | 480px (mobile max width) |

### Shadows

| Class | Usage |
|---|---|
| `shadow-elevation-1` | Subtle lift (inputs, rows) |
| `shadow-elevation-2` | Cards |
| `shadow-card` | Default card shadow |
| `shadow-card-hover` | Card on hover |
| `shadow-modal` | Modals, bottom sheets |

### Utility Classes

| Class | Description |
|---|---|
| `.app-shell` | `mx-auto max-w-app min-h-dvh` — page wrapper |
| `.pt-safe` / `.pb-safe` | Safe area top/bottom padding (for Capacitor) |
| `.text-label` | `text-2xs font-medium tracking-widest uppercase text-muted-foreground` |
| `.tap-target` | Expands touch target to 44px via `::after` |
| `.no-scrollbar` | Hides scrollbar, keeps scroll |

---

## 4. Component System

Components follow the shadcn/ui pattern: CVA variants, Radix primitives where needed, composed via `cn()`.

### Button

```tsx
import { Button } from '@/components/ui/button'

<Button variant="default">Primary</Button>       // green fill
<Button variant="secondary">Secondary</Button>   // sand fill
<Button variant="outline">Outline</Button>       // border, transparent
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>    // h-8
<Button size="default">Default</Button>  // h-10
<Button size="lg">Large</Button>    // h-12
<Button size="icon"><Icon /></Button>
```

### Input

```tsx
import { Input } from '@/components/ui/input'

<Input placeholder="Email" error={!!errors.email} />
```

- Height: `h-12`
- Error state: red border + ring

### Label

```tsx
import { Label } from '@/components/ui/label'

<Label htmlFor="email" required>Email</Label>
```

- `required` prop renders a red asterisk

### StepIndicator

```tsx
import { StepIndicator } from '@/components/auth/StepIndicator'

<StepIndicator total={5} current={2} />
```

Animated dots: passed → small filled, current → wide filled, future → border only.

### PasswordStrength

```tsx
import { PasswordStrength } from '@/components/auth/PasswordStrength'

<PasswordStrength password={password} />
```

4 checks: length ≥ 8, uppercase, number, special char. Strength levels 0–3 with colors (red → amber → primary-400 → green).

---

## 5. Auth Flow

### Email / Password sign-up (5 steps)

```
Step 0 → First + Last name
Step 1 → Age (must be 18+)
Step 2 → Role (Buyer / Seller / Both)
Step 3 → Profile photo (optional, uploaded to Supabase Storage)
Step 4 → Email + Password (with strength meter)
         ↓
supabase.auth.signUp()
         ↓
upsertUser mutation (GraphQL)
         ↓
Email confirmation required? → /check-email
No confirmation needed?      → /feed
```

### Google OAuth

```
LandingPage "Continue with Google"
         ↓
supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })
         ↓
/auth/callback (AuthCallback.tsx)
         ↓
exchangeCodeForSession()
         ↓
upsertUser mutation
         ↓
GET_ME query — does user have a role?
  No role → /onboarding (age + role, 2 steps)
  Has role → /feed
```

### Sign-in

```
supabase.auth.signInWithPassword({ email, password })
         ↓
/feed (if session exists)
```

### Supabase config

- Project: `mtlzqfhncejzkoyeflsn.supabase.co`
- Google OAuth enabled in Supabase dashboard
- Redirect URL registered: `[your-domain]/auth/callback`
- Age is stored in `supabase.auth.user_metadata` (not in the DB schema)
- Profile photos stored in Supabase Storage bucket `avatars`

### Environment variables

```env
VITE_SUPABASE_URL=https://mtlzqfhncejzkoyeflsn.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_GRAPHQL_HTTP_URL=https://criteria-newn.onrender.com/graphql
VITE_GRAPHQL_WS_URL=wss://criteria-newn.onrender.com/graphql
```

Copy `.env.example` to `.env` and fill in the values.

---

## 6. GraphQL Client

`src/lib/apollo.ts` — split link:
- **HTTP link** — queries and mutations, with `Authorization: Bearer <supabase_access_token>` header
- **WebSocket link** — subscriptions via `graphql-ws`

### Available operations (`src/lib/gql.ts`)

```graphql
mutation UpsertUser($input: UpsertUserInput!) {
  upsertUser(input: $input) { id email fullName avatarUrl role }
}

query GetMe {
  me { id email fullName avatarUrl role }
}

mutation UpdateUserRole($role: UserRole!) {
  updateUserRole(role: $role) { id role }
}
```

`UserRole` values: `buyer` | `seller` | `both` (lowercase).

---

## 7. Route Map

| Path | Component | Access |
|---|---|---|
| `/` | `LandingPage` | Public (redirects to `/feed` if session) |
| `/sign-in` | `SignInPage` | Public |
| `/sign-up` | `SignUpPage` | Public |
| `/auth/callback` | `AuthCallback` | Public (Google OAuth redirect) |
| `/check-email` | `CheckEmail` | Public |
| `/onboarding` | `Onboarding` | Protected |
| `/feed` | `Feed` | Protected |

`ProtectedRoute` wraps protected routes — redirects to `/` if no session.

---

## 8. Dev Workflow

```bash
# Install dependencies
pnpm install

# Start dev server (with network access for mobile)
pnpm --filter frontend dev --host
# → Local:   http://localhost:5173
# → Network: http://192.168.x.x:5173  ← use this in the mobile wrapper

# Type-check
pnpm --filter frontend typecheck

# Build
pnpm --filter frontend build
```
