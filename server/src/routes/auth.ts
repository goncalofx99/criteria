import { Hono } from 'hono'
import { Google, generateCodeVerifier, generateState } from 'arctic'
import { hash, verify } from '@node-rs/argon2'
import { eq, and, gt, lt, sql } from 'drizzle-orm'
import crypto from 'crypto'
import { z } from 'zod'
import { env } from '../lib/env.js'
import { db } from '../db/index.js'
import { users, sessions, passwordResetTokens, accountActionTokens, pendingSignups } from '../db/schema.js'
import { signAccessToken } from '../middleware/auth.js'
import { googleOAuthCallbackUrl, resolveOAuthRedirect } from '../lib/oauthRedirect.js'

// ─── Google OAuth client ─────────────────────────────────────────────────────

const frontendUrl = env.FRONTEND_URL ?? 'http://localhost:5173'
const google = new Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  googleOAuthCallbackUrl(env.PORT, env.NODE_ENV === 'production', env.PUBLIC_API_URL),
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REFRESH_TOKEN_EXPIRY_DAYS = 30
const SIGNUP_LINK_LIFETIME_MS = 30 * 60_000
const emailSchema = z.string().trim().toLowerCase().email().max(254)

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url')
}

async function createSession(userId: string, authVersion: number) {
  const refreshToken = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    userId,
    authVersion,
    refreshToken,
    expiresAt,
  })

  const accessToken = await signAccessToken(userId, authVersion)
  return { accessToken, refreshToken, expiresAt }
}

// In-memory store for OAuth state → code_verifier mapping
// In production with multiple instances, use Redis or a DB table.
const oauthStateStore = new Map<string, { codeVerifier: string; clientChallenge: string; redirect: string; createdAt: number }>()
const oauthExchangeStore = new Map<string, { userId: string; clientChallenge: string; createdAt: number }>()

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
    email?: unknown
    password?: unknown
    fullName?: unknown
    avatarUrl?: unknown
    role?: unknown
    age?: unknown
  }>().catch(() => null)

  if (!body) return c.json({ error: 'Enter valid account details' }, 400)

  const { email, password, fullName, avatarUrl, role, age } = body
  const parsedEmail = emailSchema.safeParse(email)
  if (!parsedEmail.success) return c.json({ error: 'Enter a valid email address' }, 400)
  if (typeof password !== 'string' || password.length < 8 || password.length > 1024) {
    return c.json({ error: 'Password must be between 8 and 1024 characters' }, 400)
  }
  if (fullName != null && (typeof fullName !== 'string' || !fullName.trim() || fullName.length > 150)) {
    return c.json({ error: 'Name must be 1 to 150 characters' }, 400)
  }
  if (typeof age !== 'number' || !Number.isInteger(age) || age < 18 || age > 120) {
    return c.json({ error: 'You must be 18 or older to create an account' }, 400)
  }
  if (role != null && role !== 'buyer' && role !== 'seller' && role !== 'both') {
    return c.json({ error: 'Choose a valid account role' }, 400)
  }
  // A new account cannot have uploaded an owned avatar yet. The client may
  // upload one after signup using its authenticated avatar namespace.
  if (avatarUrl != null) {
    return c.json({ error: 'Add a profile photo after creating your account' }, 400)
  }
  const normalizedEmail = parsedEmail.data

  if (!env.RESEND_API_KEY || !env.PASSWORD_RESET_FROM || !env.FRONTEND_URL) {
    return c.json({ error: 'Account registration is temporarily unavailable' }, 503)
  }

  // Check if user already exists
  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, normalizedEmail),
  })
  if (existing) {
    return c.json({ error: 'An account with this email already exists' }, 409)
  }

  // An outstanding request cannot be replaced by someone who knows the email.
  // Google sign-in can still create a verified account while this row is pending.
  await db.delete(pendingSignups).where(lt(pendingSignups.expiresAt, new Date()))
  const outstanding = await db.query.pendingSignups.findFirst({
    where: eq(pendingSignups.email, normalizedEmail),
  })
  c.header('Cache-Control', 'no-store')
  if (outstanding) return c.json({ pendingVerification: true }, 202)

  const passwordHash = await hash(password)
  const token = crypto.randomBytes(32).toString('base64url')
  const [pending] = await db.insert(pendingSignups).values({
    email: normalizedEmail,
    passwordHash,
    fullName: typeof fullName === 'string' ? fullName.trim() : null,
    role: role ?? 'buyer',
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + SIGNUP_LINK_LIFETIME_MS),
  }).onConflictDoNothing().returning()
  if (!pending) return c.json({ pendingVerification: true }, 202)

  const verificationUrl = new URL('/verify-signup', env.FRONTEND_URL)
  verificationUrl.searchParams.set('token', token)
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.PASSWORD_RESET_FROM,
        to: [normalizedEmail],
        subject: 'Confirme o seu email na CRITERIA',
        text: `Abra esta ligação nos próximos 30 minutos para ativar a sua conta CRITERIA:\n\n${verificationUrl.toString()}\n\nSe não criou esta conta, ignore este email.`,
      }),
    })
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`)
  } catch (error) {
    await db.delete(pendingSignups).where(eq(pendingSignups.tokenHash, pending.tokenHash))
    console.error('[Auth] Signup verification email failed:', error)
    return c.json({ error: 'Account registration is temporarily unavailable' }, 503)
  }
  return c.json({ pendingVerification: true }, 202)
})

authRoutes.post('/auth/signup/confirm', async (c) => {
  const body = await c.req.json<{ token?: unknown }>().catch(() => null)
  if (typeof body?.token !== 'string' || !/^[A-Za-z0-9_-]{40,128}$/.test(body.token)) {
    return c.json({ error: 'This verification link is invalid or has expired' }, 400)
  }
  const verificationHash = hashResetToken(body.token)
  const user = await db.transaction(async (tx) => {
    const [pending] = await tx.delete(pendingSignups).where(and(
      eq(pendingSignups.tokenHash, verificationHash),
      gt(pendingSignups.expiresAt, new Date()),
    )).returning()
    if (!pending) return null
    const [created] = await tx.insert(users).values({
      email: pending.email,
      fullName: pending.fullName,
      role: pending.role,
      passwordHash: pending.passwordHash,
      onboardingCompletedAt: new Date(),
    }).onConflictDoNothing().returning()
    return created ?? null
  })
  c.header('Cache-Control', 'no-store')
  if (!user) return c.json({ error: 'This verification link is invalid, expired, or already used' }, 400)
  const session = await createSession(user.id, user.authVersion)
  return c.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl, onboardingComplete: true },
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  })
})

// ── Email/password sign in ────────────────────────────────────────────────────

authRoutes.post('/auth/signin', async (c) => {
  const body = await c.req.json<{ email?: unknown; password?: unknown }>().catch(() => null)
  const parsedEmail = emailSchema.safeParse(body?.email)
  const password = body?.password
  if (!parsedEmail.success || typeof password !== 'string' || !password || password.length > 1024) {
    return c.json({ error: 'Invalid email or password' }, 400)
  }

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, parsedEmail.data),
  })

  if (!user || !user.passwordHash) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const valid = await verify(user.passwordHash, password)
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const session = await createSession(user.id, user.authVersion)

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

  const [rotated] = await db.update(sessions)
    .set({ refreshToken: newRefreshToken, expiresAt: newExpiresAt })
    .where(and(
      eq(sessions.id, session.id),
      eq(sessions.refreshToken, refreshToken),
      gt(sessions.expiresAt, new Date()),
    ))
    .returning()
  if (!rotated) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }

  const owner = await db.query.users.findFirst({
    columns: { authVersion: true },
    where: eq(users.id, rotated.userId),
  })
  if (!owner || owner.authVersion !== rotated.authVersion) {
    await db.delete(sessions).where(eq(sessions.id, rotated.id))
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }

  // A concurrent password/email change can delete the session after the first
  // read. Never mint at the user's newer auth version from an old session.
  const accessToken = await signAccessToken(rotated.userId, rotated.authVersion)

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
  const body = await c.req.json<{ email?: unknown }>().catch(() => null)
  const parsedEmail = emailSchema.safeParse(body?.email)
  if (!parsedEmail.success) {
    return c.json({ error: 'Enter a valid email address' }, 400)
  }
  if (!env.RESEND_API_KEY || !env.PASSWORD_RESET_FROM || !env.FRONTEND_URL) {
    return c.json({ error: 'Password recovery is temporarily unavailable' }, 503)
  }
  const email = parsedEmail.data
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
        subject: 'Repor a palavra-passe da CRITERIA',
        text: `Use esta ligação para definir uma nova palavra-passe da sua conta CRITERIA. A ligação expira dentro de 30 minutos:\n\n${resetUrl.toString()}\n\nSe não pediu a reposição da palavra-passe, ignore este email.`,
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
  const body = await c.req.json<{ token?: unknown; password?: unknown }>().catch(() => null)
  if (typeof body?.token !== 'string' || !/^[A-Za-z0-9_-]{40,128}$/.test(body.token) ||
      typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 1024) {
    return c.json({ error: 'A valid reset link and password of at least 8 characters are required' }, 400)
  }
  const tokenHash = hashResetToken(body.token)
  const passwordHash = await hash(body.password)
  const confirmed = await db.transaction(async (tx) => {
    const [record] = await tx.delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), gt(passwordResetTokens.expiresAt, new Date())))
      .returning()
    if (!record) return false
    await tx.update(users).set({
      passwordHash,
      authVersion: sql`${users.authVersion} + 1`,
      updatedAt: new Date(),
    }).where(eq(users.id, record.userId))
    await tx.delete(sessions).where(eq(sessions.userId, record.userId))
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, record.userId))
    await tx.delete(accountActionTokens).where(eq(accountActionTokens.userId, record.userId))
    return true
  })
  c.header('Cache-Control', 'no-store')
  if (!confirmed) return c.json({ error: 'This reset link is invalid or has expired' }, 400)
  return c.json({ ok: true })
})

// ── Google OAuth — initiate ───────────────────────────────────────────────────

authRoutes.get('/auth/google', async (c) => {
  const redirect = resolveOAuthRedirect(frontendUrl, c.req.query('redirect'), env.NODE_ENV !== 'production')
  if (!redirect) return c.json({ error: 'Invalid OAuth redirect' }, 400)
  const clientChallenge = c.req.query('client_challenge')
  if (!clientChallenge || !/^[A-Za-z0-9_-]{43}$/.test(clientChallenge)) {
    return c.json({ error: 'Invalid OAuth client challenge' }, 400)
  }
  const state = generateState()
  const codeVerifier = generateCodeVerifier()

  oauthStateStore.set(state, {
    codeVerifier,
    clientChallenge,
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
    // A user may have changed their CRITERIA email while keeping the same
    // Google account connected. Resolve by Google's stable subject first so
    // another account later using the old email cannot shadow that link.
    let user = await db.query.users.findFirst({
      where: eq(users.googleId, googleUser.id),
    })
    if (!user) {
      user = await db.query.users.findFirst({
        where: eq(users.email, googleUser.email.toLowerCase()),
      })
      // A matching password account does not prove mailbox ownership. Linking
      // it silently would give a pre-registered attacker the Google user's data.
      if (user && !user.googleId) {
        return c.redirect(`${frontendUrl}/sign-in?error=email_account_exists`)
      }
    }

    if (user) {
      if (user.googleId && user.googleId !== googleUser.id) {
        throw new Error('This email is linked to a different Google account')
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
    oauthExchangeStore.set(exchangeCode, { userId: user.id, clientChallenge: stored.clientChallenge, createdAt: Date.now() })
    const redirectUrl = new URL(stored.redirect)
    redirectUrl.searchParams.set('code', exchangeCode)
    return c.redirect(redirectUrl.toString())
  } catch (err) {
    console.error('[Auth] Google OAuth error:', err)
    return c.redirect(`${frontendUrl}/sign-in?error=oauth_failed`)
  }
})

authRoutes.post('/auth/google/exchange', async (c) => {
  const body = await c.req.json<{ code?: string; clientVerifier?: string }>().catch(() => null)
  if (!body) return c.json({ error: 'Invalid exchange request' }, 400)
  const code = body.code
  if (!code || typeof body.clientVerifier !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.clientVerifier)) {
    return c.json({ error: 'Exchange code and client verifier are required' }, 400)
  }
  const pending = oauthExchangeStore.get(code)
  oauthExchangeStore.delete(code)
  if (!pending || Date.now() - pending.createdAt > 2 * 60 * 1000) {
    return c.json({ error: 'Invalid or expired exchange code' }, 401)
  }
  const submittedChallenge = crypto.createHash('sha256').update(body.clientVerifier).digest()
  const expectedChallenge = Buffer.from(pending.clientChallenge, 'base64url')
  if (expectedChallenge.length !== submittedChallenge.length || !crypto.timingSafeEqual(expectedChallenge, submittedChallenge)) {
    return c.json({ error: 'Invalid or expired exchange code' }, 401)
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, pending.userId) })
  if (!user) return c.json({ error: 'Account no longer exists' }, 401)
  const session = await createSession(user.id, user.authVersion)
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
