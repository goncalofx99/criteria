import { GraphQLError } from 'graphql'
import { users } from '../../db/schema.js'
import { validate, upsertUserSchema } from '../../lib/validate.js'
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
    // Called by the frontend immediately after Google login.
    // Inserts the user if new, updates profile info if returning.
    upsertUser: async (
      _: unknown,
      { input }: { input: unknown },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)
      const data = validate(upsertUserSchema, input)

      const [user] = await ctx.db
        .insert(users)
        .values({
          id: userId,
          email: data.email,
          fullName: data.fullName ?? null,
          avatarUrl: data.avatarUrl ?? null,
          role: data.role ?? 'buyer',
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: data.email,
            fullName: data.fullName ?? null,
            avatarUrl: data.avatarUrl ?? null,
            ...(data.role ? { role: data.role } : {}),
            updatedAt: new Date(),
          },
        })
        .returning()

      return user
    },
  },
}
