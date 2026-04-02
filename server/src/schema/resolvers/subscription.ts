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

      // Extracts the message from the published payload for the GraphQL response.
      resolve: (payload: { messageSent: Message }) => payload.messageSent,
    },
  },
}
