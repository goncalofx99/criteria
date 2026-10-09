import { GraphQLError } from 'graphql'
import { eq } from 'drizzle-orm'
import { conversations } from '../../db/schema.js'
import { pubsub, EVENTS } from '../../lib/pubsub.js'
import type { Context } from '../../context.js'
import type { Message } from '../../db/schema.js'

export const subscriptionResolvers = {
  Subscription: {
    messageSent: {
      // Called when the client opens a WebSocket subscription.
      // We verify auth and participant status here — unauthenticated or
      // non-participant clients get an error immediately on subscribe.
      subscribe: async (
        _: unknown,
        { conversationId }: { conversationId: string },
        ctx: Context
      ) => {
        if (!ctx.userId) {
          throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' },
          })
        }

        const conv = await ctx.db.query.conversations.findFirst({
          where: eq(conversations.id, conversationId),
        })

        if (!conv) {
          throw new GraphQLError('Conversation not found', {
            extensions: { code: 'NOT_FOUND' },
          })
        }

        if (conv.buyerId !== ctx.userId && conv.sellerId !== ctx.userId) {
          throw new GraphQLError('Forbidden', {
            extensions: { code: 'FORBIDDEN' },
          })
        }

        return pubsub.asyncIterableIterator(`${EVENTS.MESSAGE_SENT}.${conversationId}`)
      },

      // A subscription can stay open longer than an access token or account
      // session. Re-check every event before exposing the new message.
      resolve: async (payload: { messageSent: Message }, _: unknown, ctx: Context) => {
        const userId = ctx.revalidateAuth ? await ctx.revalidateAuth() : null
        if (!userId || userId !== ctx.userId) {
          throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' },
          })
        }
        const conv = await ctx.db.query.conversations.findFirst({
          where: eq(conversations.id, payload.messageSent.conversationId),
        })
        if (!conv || (conv.buyerId !== userId && conv.sellerId !== userId)) {
          throw new GraphQLError('Conversation not available', {
            extensions: { code: 'FORBIDDEN' },
          })
        }
        return payload.messageSent
      },
    },
  },
}
