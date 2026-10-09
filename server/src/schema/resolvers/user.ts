import { GraphQLError } from 'graphql'
import { eq } from 'drizzle-orm'
import { users } from '../../db/schema.js'
import { validate, upsertUserSchema } from '../../lib/validate.js'
import { validAvatarUrl } from '../../lib/uploadKey.js'
import type { Context } from '../../context.js'
import type { User } from '../../db/schema.js'

function requireAuth(ctx: Context) {
  if (!ctx.userId) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return ctx.userId
}

export const userResolvers = {
  // Email is private — only the authenticated user sees their own.
  // All other callers (e.g. viewing a post author) receive null.
  User: {
    email: (user: User, _: unknown, ctx: Context) =>
      ctx.userId === user.id ? user.email : null,
    onboardingComplete: (user: User) => Boolean(user.onboardingCompletedAt),
  },

  Query: {
    me: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.userId) return null
      return ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.userId!),
      })
    },
  },

  Mutation: {
    // Updates the authenticated user's profile and completes first Google
    // onboarding only after an adult age and role have been supplied.
    upsertUser: async (
      _: unknown,
      { input }: { input: unknown },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)
      const data = validate(upsertUserSchema, input)
      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.id, userId),
      })
      if (!existing) {
        throw new GraphQLError('Account not found', { extensions: { code: 'NOT_FOUND' } })
      }
      if (data.email && data.email.toLowerCase() !== existing.email.toLowerCase()) {
        throw new GraphQLError('Account email cannot be changed here', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }
      if (data.avatarUrl && data.avatarUrl !== existing.avatarUrl &&
          !validAvatarUrl(userId, data.avatarUrl, process.env.R2_PUBLIC_URL ?? '')) {
        throw new GraphQLError('Profile photos must be uploaded to your own account', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }
      if (!existing.onboardingCompletedAt && (!data.role || data.age === undefined)) {
        throw new GraphQLError('Choose a role and confirm your age to finish onboarding', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      const [user] = await ctx.db
        .update(users)
        .set({
          ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
          ...(data.role ? { role: data.role } : {}),
          ...(!existing.onboardingCompletedAt ? { onboardingCompletedAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning()

      return user
    },
  },
}
