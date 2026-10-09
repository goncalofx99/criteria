import crypto from 'node:crypto'
import { Hono } from 'hono'
import { hash, verify } from '@node-rs/argon2'
import { and, eq, gt, inArray, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import {
  accountActionTokens,
  accountDeletionJobs,
  conversations,
  passwordResetTokens,
  sessions,
  users,
} from '../db/schema.js'
import { env } from '../lib/env.js'
import { runAccountDeletionCleanup } from '../lib/accountDeletion.js'
import { verifyJwt } from '../middleware/auth.js'

const emailSchema = z.string().trim().toLowerCase().email().max(254)
const LINK_LIFETIME_MS = 30 * 60_000
const REQUEST_COOLDOWN_MS = 60_000

function newLinkToken() {
  return crypto.randomBytes(32).toString('base64url')
}

function tokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function parseLinkToken(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{40,128}$/.test(value) ? value : null
}

function emailAvailable() {
  return Boolean(env.RESEND_API_KEY && env.PASSWORD_RESET_FROM && env.FRONTEND_URL)
}

async function sendSecurityEmail(to: string, subject: string, text: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.PASSWORD_RESET_FROM, to: [to], subject, text }),
  })
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`)
}

function actionUrl(path: string, token: string, step?: string) {
  const url = new URL(path, env.FRONTEND_URL!)
  url.searchParams.set('token', token)
  if (step) url.searchParams.set('step', step)
  return url.toString()
}

async function currentUser(authHeader?: string) {
  if (!authHeader?.startsWith('Bearer ')) return null
  const userId = await verifyJwt(authHeader.slice(7))
  if (!userId) return null
  return db.query.users.findFirst({ where: eq(users.id, userId) })
}

async function recentAction(userId: string, action: 'email_current' | 'delete') {
  return db.query.accountActionTokens.findFirst({
    where: and(
      eq(accountActionTokens.userId, userId),
      eq(accountActionTokens.action, action),
      gt(accountActionTokens.createdAt, new Date(Date.now() - REQUEST_COOLDOWN_MS)),
    ),
  })
}

function isUniqueEmailError(error: unknown) {
  const detail = error as { code?: string; cause?: { code?: string } }
  return detail?.code === '23505' || detail?.cause?.code === '23505'
}

export const accountRoutes = new Hono()

accountRoutes.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store')
  await next()
})

accountRoutes.post('/auth/account/password', async (c) => {
  const user = await currentUser(c.req.header('Authorization'))
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  if (!user.passwordHash) {
    return c.json({ error: 'Use the password reset link sent to your account email to set a password' }, 400)
  }
  const currentHash = user.passwordHash
  const body = await c.req.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null
  if (typeof body?.currentPassword !== 'string' ||
      typeof body.newPassword !== 'string' ||
      body.newPassword.length < 8 || body.newPassword.length > 1024) {
    return c.json({ error: 'Enter your current password and a new password of at least 8 characters' }, 400)
  }
  if (!await verify(currentHash, body.currentPassword)) {
    return c.json({ error: 'Current password is incorrect' }, 401)
  }
  const passwordHash = await hash(body.newPassword)
  const changed = await db.transaction(async (tx) => {
    const [updated] = await tx.update(users).set({
      passwordHash,
      authVersion: sql`${users.authVersion} + 1`,
      updatedAt: new Date(),
    }).where(and(
      eq(users.id, user.id),
      eq(users.passwordHash, currentHash),
      eq(users.authVersion, user.authVersion),
    )).returning()
    // Two concurrent requests may both verify the original password. Only
    // one is allowed to change it; the second must reauthenticate.
    if (!updated) return false
    await tx.delete(sessions).where(eq(sessions.userId, user.id))
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))
    await tx.delete(accountActionTokens).where(eq(accountActionTokens.userId, user.id))
    return true
  })
  if (!changed) return c.json({ error: 'Your password changed in another session. Sign in again.' }, 409)
  return c.json({ ok: true })
})

accountRoutes.post('/auth/account/email/request', async (c) => {
  const user = await currentUser(c.req.header('Authorization'))
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  if (!emailAvailable()) return c.json({ error: 'Email changes are temporarily unavailable' }, 503)
  const body = await c.req.json().catch(() => null) as { email?: unknown } | null
  const parsed = emailSchema.safeParse(body?.email)
  if (!parsed.success) return c.json({ error: 'Enter a valid new email address' }, 400)
  const targetEmail = parsed.data
  if (targetEmail === user.email) return c.json({ error: 'This is already your account email' }, 400)
  if (await db.query.users.findFirst({ where: eq(users.email, targetEmail) })) {
    return c.json({ error: 'This email is already in use' }, 409)
  }
  const recent = await recentAction(user.id, 'email_current')
  if (recent) {
    if (recent.targetEmail === targetEmail) return c.json({ ok: true })
    return c.json({ error: 'Wait a minute before requesting a different email address' }, 429)
  }

  const token = newLinkToken()
  await db.delete(accountActionTokens).where(and(
    eq(accountActionTokens.userId, user.id),
    inArray(accountActionTokens.action, ['email_current', 'email_new']),
  ))
  const [record] = await db.insert(accountActionTokens).values({
    userId: user.id,
    action: 'email_current',
    targetEmail,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + LINK_LIFETIME_MS),
  }).returning()

  try {
    await sendSecurityEmail(
      user.email,
      'Approve your CRITERIA email change',
      `A request was made to change your CRITERIA email to ${targetEmail}. Open this link within 30 minutes to approve it:\n\n${actionUrl('/settings/verify-email', token, 'current')}\n\nIf this was not you, ignore this email. Your address will stay the same.`,
    )
  } catch (error) {
    await db.delete(accountActionTokens).where(eq(accountActionTokens.id, record.id))
    console.error('[Account] Current email verification failed:', error)
    return c.json({ error: 'Email changes are temporarily unavailable' }, 503)
  }
  return c.json({ ok: true })
})

accountRoutes.post('/auth/account/email/confirm-current', async (c) => {
  if (!emailAvailable()) return c.json({ error: 'Email changes are temporarily unavailable' }, 503)
  const body = await c.req.json().catch(() => null) as { token?: unknown } | null
  const token = parseLinkToken(body?.token)
  if (!token) return c.json({ error: 'This verification link is invalid or expired' }, 400)
  const record = await db.query.accountActionTokens.findFirst({
    where: and(
      eq(accountActionTokens.tokenHash, tokenHash(token)),
      eq(accountActionTokens.action, 'email_current'),
      gt(accountActionTokens.expiresAt, new Date()),
    ),
  })
  if (!record?.targetEmail) return c.json({ error: 'This verification link is invalid or expired' }, 400)
  if (await db.query.users.findFirst({ where: eq(users.email, record.targetEmail) })) {
    return c.json({ error: 'This email is already in use' }, 409)
  }

  const nextToken = newLinkToken()
  const nextRecord = await db.transaction(async (tx) => {
    const [consumed] = await tx.delete(accountActionTokens).where(and(
      eq(accountActionTokens.id, record.id),
      gt(accountActionTokens.expiresAt, new Date()),
    )).returning()
    if (!consumed) return null
    const [inserted] = await tx.insert(accountActionTokens).values({
      userId: consumed.userId,
      action: 'email_new',
      targetEmail: consumed.targetEmail,
      tokenHash: tokenHash(nextToken),
      expiresAt: new Date(Date.now() + LINK_LIFETIME_MS),
    }).returning()
    return inserted
  })
  if (!nextRecord?.targetEmail) return c.json({ error: 'This verification link is invalid or expired' }, 400)

  try {
    await sendSecurityEmail(
      nextRecord.targetEmail,
      'Verify your new CRITERIA email',
      `Open this link within 30 minutes to finish changing your CRITERIA email:\n\n${actionUrl('/settings/verify-email', nextToken, 'new')}\n\nIf you did not request this, ignore this email.`,
    )
  } catch (error) {
    await db.delete(accountActionTokens).where(eq(accountActionTokens.id, nextRecord.id))
    console.error('[Account] New email verification failed:', error)
    return c.json({ error: 'Could not send verification to the new address. Start the change again.' }, 503)
  }
  return c.json({ ok: true })
})

accountRoutes.post('/auth/account/email/confirm-new', async (c) => {
  const body = await c.req.json().catch(() => null) as { token?: unknown } | null
  const token = parseLinkToken(body?.token)
  if (!token) return c.json({ error: 'This verification link is invalid or expired' }, 400)
  try {
    const changed = await db.transaction(async (tx) => {
      const [record] = await tx.delete(accountActionTokens).where(and(
        eq(accountActionTokens.tokenHash, tokenHash(token)),
        eq(accountActionTokens.action, 'email_new'),
        gt(accountActionTokens.expiresAt, new Date()),
      )).returning()
      if (!record?.targetEmail) return false
      const [updated] = await tx.update(users).set({
        email: record.targetEmail,
        authVersion: sql`${users.authVersion} + 1`,
        updatedAt: new Date(),
      }).where(eq(users.id, record.userId)).returning()
      if (!updated) throw new Error('Account missing while confirming new email')
      await tx.delete(sessions).where(eq(sessions.userId, record.userId))
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, record.userId))
      await tx.delete(accountActionTokens).where(eq(accountActionTokens.userId, record.userId))
      return true
    })
    if (!changed) return c.json({ error: 'This verification link is invalid or expired' }, 400)
  } catch (error) {
    if (isUniqueEmailError(error)) return c.json({ error: 'This email is already in use' }, 409)
    throw error
  }
  return c.json({ ok: true })
})

accountRoutes.post('/auth/account/delete/request', async (c) => {
  const user = await currentUser(c.req.header('Authorization'))
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  if (!emailAvailable()) return c.json({ error: 'Account deletion is temporarily unavailable' }, 503)
  const body = await c.req.json().catch(() => null) as { password?: unknown } | null
  if (user.passwordHash &&
      (typeof body?.password !== 'string' || !await verify(user.passwordHash, body.password))) {
    return c.json({ error: 'Current password is incorrect' }, 401)
  }
  if (await recentAction(user.id, 'delete')) return c.json({ ok: true })

  const token = newLinkToken()
  await db.delete(accountActionTokens).where(and(
    eq(accountActionTokens.userId, user.id),
    eq(accountActionTokens.action, 'delete'),
  ))
  const [record] = await db.insert(accountActionTokens).values({
    userId: user.id,
    action: 'delete',
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + LINK_LIFETIME_MS),
  }).returning()
  try {
    await sendSecurityEmail(
      user.email,
      'Confirm deletion of your CRITERIA account',
      `A request was made to permanently delete your CRITERIA account, including your listings, buyer requests, and conversations. Open this link within 30 minutes to confirm:\n\n${actionUrl('/settings/confirm-delete', token)}\n\nIf this was not you, ignore this email. Your account will stay open.`,
    )
  } catch (error) {
    await db.delete(accountActionTokens).where(eq(accountActionTokens.id, record.id))
    console.error('[Account] Deletion verification email failed:', error)
    return c.json({ error: 'Account deletion is temporarily unavailable' }, 503)
  }
  return c.json({ ok: true })
})

accountRoutes.post('/auth/account/delete/confirm', async (c) => {
  const body = await c.req.json().catch(() => null) as { token?: unknown } | null
  const token = parseLinkToken(body?.token)
  if (!token) return c.json({ error: 'This deletion link is invalid or expired' }, 400)
  const deletedUserId = await db.transaction(async (tx) => {
    const [record] = await tx.delete(accountActionTokens).where(and(
      eq(accountActionTokens.tokenHash, tokenHash(token)),
      eq(accountActionTokens.action, 'delete'),
      gt(accountActionTokens.expiresAt, new Date()),
    )).returning()
    if (!record) return null

    // Explicitly remove conversations first. A deleted post would otherwise
    // SET NULL on its conversation FK before the user's own CASCADE fires,
    // violating the one_post_set check constraint.
    await tx.delete(conversations).where(or(
      eq(conversations.buyerId, record.userId),
      eq(conversations.sellerId, record.userId),
    ))
    await tx.insert(accountDeletionJobs).values({ userId: record.userId })
    const [deleted] = await tx.delete(users).where(eq(users.id, record.userId)).returning()
    if (!deleted) throw new Error('Account missing while confirming deletion')
    return record.userId
  })
  if (!deletedUserId) return c.json({ error: 'This deletion link is invalid or expired' }, 400)

  // The queued job survives a process crash or R2 outage and is retried by the
  // startup/interval worker. Only avatar and post objects in this UUID's owned
  // namespaces are removed; external Google avatars are never touched.
  void runAccountDeletionCleanup(deletedUserId).catch((error) => {
    console.error('[Account] R2 deletion pending retry:', deletedUserId, error)
  })
  return c.json({ ok: true })
})
