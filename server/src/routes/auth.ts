import { Hono } from 'hono'
import { Google, generateCodeVerifier, generateState } from 'arctic'
import { hash, verify } from '@node-rs/argon2'
import { eq, and, gt } from 'drizzle-orm'
import crypto from 'crypto'
import { env } from '../lib/env.js'
import { db } from '../db/index.js'
import { users, sessions } from '../db/schema.js'
import { signAccessToken } from '../middleware/auth.js'

// ─── Google OAuth client ─────────────────────────────────────────────────────

const frontendUrl = env.FRONTEND_URL ?? 'http://localhost:5173'
const serverUrl = env.NODE_ENV === 'production'
  ? 'https://criteria-newn.onrender.com'
  : `http://localhost:${env.PORT}`

const google = new Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${serverUrl}/auth/google/callback`,
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REFRESH_TOKEN_EXPIRY_DAYS = 30

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url')
}

async function createSession(userId: string) {
  const refreshToken = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    userId,
    refreshToken,
    expiresAt,
  })

  const accessToken = await signAccessToken(userId)
  return { accessToken, refreshToken, expiresAt }
}

// In-memory store for OAuth state → code_verifier mapping
// In production with multiple instances, use Redis or a DB table.
const oauthStateStore = new Map<string, { codeVerifier: string; redirect?: string; createdAt: number }>()

// Clean up expired states every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  for (const [key, value] of oauthStateStore) {
    if (value.createdAt < fiveMinutesAgo) oauthStateStore.delete(key)
  }
}, 5 * 60 * 1000)

// ─── Routes ───────────────────────────────────────────────────────────────────

export const authRoutes = new Hono()

// ── Email/password sign up ────────────────────────────────────────────────────

authRoutes.post('/auth/signup', async (c) => {
  const body = await c.req.json<{
    email: string
    password: string
    fullName?: string
    avatarUrl?: string
    role?: 'buyer' | 'seller' | 'both'
  }>()

  const { email, password, fullName, avatarUrl, role } = body

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400)
  }

  // Check if user already exists
  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email.toLowerCase()),
  })
  if (existing) {
    return c.json({ error: 'An account with this email already exists' }, 409)
  }

  const passwordHash = await hash(password)

  const [user] = await db.insert(users).values({
    email: email.toLowerCase(),
    fullName: fullName ?? null,
    avatarUrl: avatarUrl ?? null,
    role: role ?? 'buyer',
    passwordHash,
  }).returning()

  const session = await createSession(user.id)

  return c.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl },
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  })
})

// ── Email/password sign in ────────────────────────────────────────────────────

authRoutes.post('/auth/signin', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>()
  const { email, password } = body

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email.toLowerCase()),
  })

  if (!user || !user.passwordHash) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const valid = await verify(user.passwordHash, password)
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const session = await createSession(user.id)

  return c.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl },
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  })
})

// ── Refresh token ─────────────────────────────────────────────────────────────

authRoutes.post('/auth/refresh', async (c) => {
  const body = await c.req.json<{ refreshToken: string }>()
  const { refreshToken } = body

  if (!refreshToken) {
    return c.json({ error: 'Refresh token is required' }, 400)
  }

  const session = await db.query.sessions.findFirst({
    where: (s, { eq, and, gt }) =>
      and(eq(s.refreshToken, refreshToken), gt(s.expiresAt, new Date())),
  })

  if (!session) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }

  // Rotate refresh token
  const newRefreshToken = generateRefreshToken()
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await db.update(sessions)
    .set({ refreshToken: newRefreshToken, expiresAt: newExpiresAt })
    .where(eq(sessions.id, session.id))

  const accessToken = await signAccessToken(session.userId)

  return c.json({
    accessToken,
    refreshToken: newRefreshToken,
  })
})

// ── Sign out ──────────────────────────────────────────────────────────────────

authRoutes.post('/auth/signout', async (c) => {
  const body = await c.req.json<{ refreshToken: string }>()
  const { refreshToken } = body

  if (refreshToken) {
    await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken))
  }

  return c.json({ ok: true })
})

// ── Google OAuth — initiate ───────────────────────────────────────────────────

authRoutes.get('/auth/google', async (c) => {
  const redirect = c.req.query('redirect') // optional: where to send user after auth
  const state = generateState()
  const codeVerifier = generateCodeVerifier()

  oauthStateStore.set(state, {
    codeVerifier,
    redirect: redirect || undefined,
    createdAt: Date.now(),
  })

  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'email', 'profile'])

  return c.redirect(url.toString())
})

// ── Google OAuth — callback ───────────────────────────────────────────────────

authRoutes.get('/auth/google/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')

  if (!code || !state) {
    return c.redirect(`${frontendUrl}/sign-in?error=missing_params`)
  }

  const stored = oauthStateStore.get(state)
  if (!stored) {
    return c.redirect(`${frontendUrl}/sign-in?error=invalid_state`)
  }
  oauthStateStore.delete(state)

  try {
    const tokens = await google.validateAuthorizationCode(code, stored.codeVerifier)
    const accessToken = tokens.accessToken()

    // Fetch user info from Google
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const googleUser = await res.json() as {
      id: string
      email: string
      name?: string
      picture?: string
    }

    // Find or create user
    let user = await db.query.users.findFirst({
      where: (u, { or, eq }) =>
        or(eq(u.googleId, googleUser.id), eq(u.email, googleUser.email.toLowerCase())),
    })

    if (user) {
      // Link Google ID if not already linked
      if (!user.googleId) {
        await db.update(users)
          .set({
            googleId: googleUser.id,
            avatarUrl: user.avatarUrl || googleUser.picture || null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
      }
    } else {
      const [newUser] = await db.insert(users).values({
        email: googleUser.email.toLowerCase(),
        fullName: googleUser.name || null,
        avatarUrl: googleUser.picture || null,
        googleId: googleUser.id,
        role: 'buyer', // default; user picks role in onboarding
      }).returning()
      user = newUser
    }

    const session = await createSession(user.id)

    // Redirect back to frontend with tokens
    const redirectUrl = stored.redirect || `${frontendUrl}/auth/callback`
    const params = new URLSearchParams({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    })

    return c.redirect(`${redirectUrl}?${params.toString()}`)
  } catch (err) {
    console.error('[Auth] Google OAuth error:', err)
    return c.redirect(`${frontendUrl}/sign-in?error=oauth_failed`)
  }
})

// ── Get current user (from access token) ──────────────────────────────────────

authRoutes.get('/auth/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ user: null }, 401)
  }

  const { verifyJwt } = await import('../middleware/auth.js')
  const userId = await verifyJwt(authHeader.slice(7))
  if (!userId) {
    return c.json({ user: null }, 401)
  }

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
  })

  if (!user) {
    return c.json({ user: null }, 404)
  }

  return c.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl },
  })
})
