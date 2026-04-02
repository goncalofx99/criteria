import { GraphQLError } from 'graphql'
import { eq } from 'drizzle-orm'
import { users } from '../../db/schema.js'
import type { Context } from '../../context.js'

type UpsertUserInput = {
  email: string
  fullName?: string
  avatarUrl?: string
  role?: 'buyer' | 'seller' | 'both'
}

function requireAuth(ctx: Context) {
  if (!ctx.userId) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return ctx.userId
}

export const userResolvers = {
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
      { input }: { input: UpsertUserInput },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)

      const [user] = await ctx.db
        .insert(users)
        .values({
          id: userId,
          email: input.email,
          fullName: input.fullName ?? null,
          avatarUrl: input.avatarUrl ?? null,
          role: input.role ?? 'buyer',
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: input.email,
            fullName: input.fullName ?? null,
            avatarUrl: input.avatarUrl ?? null,
            ...(input.role ? { role: input.role } : {}),
            updatedAt: new Date(),
          },
        })
        .returning()

      return user
    },
  },
}
