import { Hono } from 'hono'
import { Google, generateCodeVerifier, generateState } from 'arctic'
import { hash, verify } from '@node-rs/argon2'
import { eq, and, gt } from 'drizzle-orm'
import crypto from 'crypto'
import { env } from '../lib/env.js'
import { db } from '../db/index.js'
import { users, sessions, passwordResetTokens } from '../db/schema.js'
import { signAccessToken } from '../middleware/auth.js'
import { resolveOAuthRedirect } from '../lib/oauthRedirect.js'

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

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

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
const oauthStateStore = new Map<string, { codeVerifier: string; redirect: string; createdAt: number }>()
const oauthExchangeStore = new Map<string, { userId: string; createdAt: number }>()

// Clean up expired states every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  for (const [key, value] of oauthStateStore) {
    if (value.createdAt < fiveMinutesAgo) oauthStateStore.delete(key)
  }
  const twoMinutesAgo = Date.now() - 2 * 60 * 1000
  for (const [key, value] of oauthExchangeStore) {
    if (value.createdAt < twoMinutesAgo) oauthExchangeStore.delete(key)
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
    age?: number
  }>()

  const { email, password, fullName, avatarUrl, role, age } = body

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400)
  }
  if (!Number.isInteger(age) || age! < 18 || age! > 120) {
    return c.json({ error: 'You must be 18 or older to create an account' }, 400)
  }
  if (role && !['buyer', 'seller', 'both'].includes(role)) {
    return c.json({ error: 'Choose a valid account role' }, 400)
  }
  // A new account cannot have uploaded an owned avatar yet. The client may
  // upload one after signup using its authenticated avatar namespace.
  if (avatarUrl != null) {
    return c.json({ error: 'Add a profile photo after creating your account' }, 400)
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
    avatarUrl: null,
    role: role ?? 'buyer',
    passwordHash,
    onboardingCompletedAt: new Date(),
  }).returning()

  const session = await createSession(user.id)

  return c.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl, onboardingComplete: true },
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
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl, onboardingComplete: Boolean(user.onboardingCompletedAt) },
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

// ── Password recovery ────────────────────────────────────────────────────────

authRoutes.post('/auth/password-reset/request', async (c) => {
  if (!env.RESEND_API_KEY || !env.PASSWORD_RESET_FROM || !env.FRONTEND_URL) {
    return c.json({ error: 'Password recovery is temporarily unavailable' }, 503)
  }
  const body = await c.req.json<{ email?: string }>()
  const email = body.email?.trim().toLowerCase()
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return c.json({ error: 'Enter a valid email address' }, 400)
  }
  c.header('Cache-Control', 'no-store')
  const ok = { ok: true, message: 'If an account exists, a reset link has been sent.' }
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) return c.json(ok)

  const recent = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.userId, user.id),
      gt(passwordResetTokens.createdAt, new Date(Date.now() - 60_000)),
    ),
  })
  if (recent) return c.json(ok)

  const token = crypto.randomBytes(32).toString('base64url')
  const [record] = await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + 30 * 60_000),
  }).returning()
  const resetUrl = new URL('/reset-password', env.FRONTEND_URL)
  resetUrl.searchParams.set('token', token)
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.PASSWORD_RESET_FROM,
        to: [user.email],
        subject: 'Reset your CRITERIA password',
        text: `Use this link to reset your CRITERIA password. It expires in 30 minutes:\n\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
      }),
    })
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`)
  } catch (error) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, record.id))
    console.error('[Auth] Password reset email failed:', error)
    return c.json({ error: 'Password recovery is temporarily unavailable' }, 503)
  }
  return c.json(ok)
})

authRoutes.post('/auth/password-reset/confirm', async (c) => {
  const body = await c.req.json<{ token?: string; password?: string }>()
  if (!body.token || body.token.length > 128 || !body.password || body.password.length < 8) {
    return c.json({ error: 'A valid reset link and password of at least 8 characters are required' }, 400)
  }
  const tokenHash = hashResetToken(body.token)
  const passwordHash = await hash(body.password)
  const confirmed = await db.transaction(async (tx) => {
    const [record] = await tx.delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), gt(passwordResetTokens.expiresAt, new Date())))
      .returning()
    if (!record) return false
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, record.userId))
    await tx.delete(sessions).where(eq(sessions.userId, record.userId))
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, record.userId))
    return true
  })
  c.header('Cache-Control', 'no-store')
  if (!confirmed) return c.json({ error: 'This reset link is invalid or has expired' }, 400)
  return c.json({ ok: true })
})

// ── Google OAuth — initiate ───────────────────────────────────────────────────

authRoutes.get('/auth/google', async (c) => {
  const redirect = resolveOAuthRedirect(frontendUrl, c.req.query('redirect'))
  if (!redirect) return c.json({ error: 'Invalid OAuth redirect' }, 400)
  const state = generateState()
  const codeVerifier = generateCodeVerifier()

  oauthStateStore.set(state, {
    codeVerifier,
    redirect,
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
  if (!stored || Date.now() - stored.createdAt > 5 * 60 * 1000) {
    oauthStateStore.delete(state)
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
      verified_email?: boolean
      name?: string
      picture?: string
    }
    if (!res.ok || !googleUser.id || !googleUser.email || googleUser.verified_email !== true) {
      throw new Error('Google did not provide a verified email address')
    }

    // Find or create user
    let user = await db.query.users.findFirst({
      where: (u, { or, eq }) =>
        or(eq(u.googleId, googleUser.id), eq(u.email, googleUser.email.toLowerCase())),
    })

    if (user) {
      if (user.googleId && user.googleId !== googleUser.id) {
        throw new Error('This email is linked to a different Google account')
      }
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

    // The callback URL carries only a short-lived, single-use exchange code.
    // Tokens are created after the app redeems it over HTTPS.
    const exchangeCode = crypto.randomBytes(32).toString('base64url')
    oauthExchangeStore.set(exchangeCode, { userId: user.id, createdAt: Date.now() })
    const redirectUrl = new URL(stored.redirect)
    redirectUrl.searchParams.set('code', exchangeCode)
    return c.redirect(redirectUrl.toString())
  } catch (err) {
    console.error('[Auth] Google OAuth error:', err)
    return c.redirect(`${frontendUrl}/sign-in?error=oauth_failed`)
  }
})

authRoutes.post('/auth/google/exchange', async (c) => {
  const body = await c.req.json<{ code?: string }>()
  const code = body.code
  if (!code) return c.json({ error: 'Exchange code is required' }, 400)
  const pending = oauthExchangeStore.get(code)
  oauthExchangeStore.delete(code)
  if (!pending || Date.now() - pending.createdAt > 2 * 60 * 1000) {
    return c.json({ error: 'Invalid or expired exchange code' }, 401)
  }
  const session = await createSession(pending.userId)
  c.header('Cache-Control', 'no-store')
  return c.json({ accessToken: session.accessToken, refreshToken: session.refreshToken })
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
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl, onboardingComplete: Boolean(user.onboardingCompletedAt) },
  })
})
