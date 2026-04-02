import { GraphQLError } from 'graphql'
import { eq, or, and, desc } from 'drizzle-orm'
import { conversations, messages, users, buyerPosts, sellerPosts } from '../../db/schema.js'
import { validate, startConversationSchema, sendMessageSchema } from '../../lib/validate.js'
import { pubsub, EVENTS } from '../../lib/pubsub.js'
import type { Context } from '../../context.js'
import type { Conversation, Message } from '../../db/schema.js'

function requireAuth(ctx: Context) {
  if (!ctx.userId) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return ctx.userId
}

// Ensures the requesting user is a participant in the conversation.
function requireParticipant(conversation: Conversation, userId: string) {
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
    throw new GraphQLError('Forbidden', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
}

export const conversationResolvers = {
  Conversation: {
    buyer: (c: Conversation, _: unknown, ctx: Context) =>
      ctx.db.query.users.findFirst({ where: eq(users.id, c.buyerId) }),
    seller: (c: Conversation, _: unknown, ctx: Context) =>
      ctx.db.query.users.findFirst({ where: eq(users.id, c.sellerId) }),
    buyerPost: (c: Conversation, _: unknown, ctx: Context) =>
      c.buyerPostId
        ? ctx.db.query.buyerPosts.findFirst({ where: eq(buyerPosts.id, c.buyerPostId) })
        : null,
    sellerPost: (c: Conversation, _: unknown, ctx: Context) =>
      c.sellerPostId
        ? ctx.db.query.sellerPosts.findFirst({ where: eq(sellerPosts.id, c.sellerPostId) })
        : null,
    messages: (c: Conversation, _: unknown, ctx: Context) =>
      ctx.db.query.messages.findMany({
        where: eq(messages.conversationId, c.id),
        orderBy: (m) => desc(m.createdAt),
      }),
  },

  Message: {
    sender: (m: Message, _: unknown, ctx: Context) =>
      ctx.db.query.users.findFirst({ where: eq(users.id, m.senderId) }),
  },

  Query: {
    myConversations: (_: unknown, __: unknown, ctx: Context) => {
      const userId = requireAuth(ctx)
      return ctx.db.query.conversations.findMany({
        where: or(
          eq(conversations.buyerId, userId),
          eq(conversations.sellerId, userId)
        ),
        orderBy: (c) => desc(c.createdAt),
      })
    },

    conversation: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      const userId = requireAuth(ctx)
      const conv = await ctx.db.query.conversations.findFirst({
        where: eq(conversations.id, id),
      })
      if (!conv) return null
      requireParticipant(conv, userId)
      return conv
    },
  },

  Mutation: {
    // Idempotent — returns the existing conversation if one already exists
    // between this buyer/seller pair about the same post.
    startConversation: async (
      _: unknown,
      { input }: { input: unknown },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)
      const data = validate(startConversationSchema, input)

      if (data.buyerPostId) {
        // User is a seller reaching out to a buyer post
        const post = await ctx.db.query.buyerPosts.findFirst({
          where: eq(buyerPosts.id, data.buyerPostId),
        })
        if (!post || !post.isActive) {
          throw new GraphQLError('Buyer post not found or inactive', {
            extensions: { code: 'NOT_FOUND' },
          })
        }
        if (post.buyerId === userId) {
          throw new GraphQLError('Cannot start a conversation with yourself', {
            extensions: { code: 'BAD_USER_INPUT' },
          })
        }

        // Return existing conversation if already started
        const existing = await ctx.db.query.conversations.findFirst({
          where: and(
            eq(conversations.buyerPostId, data.buyerPostId),
            eq(conversations.sellerId, userId)
          ),
        })
        if (existing) return existing

        const [conv] = await ctx.db
          .insert(conversations)
          .values({
            buyerPostId: data.buyerPostId,
            buyerId: post.buyerId,
            sellerId: userId,
          })
          .returning()
        return conv
      }

      // User is a buyer reaching out to a seller post
      const post = await ctx.db.query.sellerPosts.findFirst({
        where: eq(sellerPosts.id, data.sellerPostId!),
      })
      if (!post || !post.isActive) {
        throw new GraphQLError('Seller post not found or inactive', {
          extensions: { code: 'NOT_FOUND' },
        })
      }
      if (post.sellerId === userId) {
        throw new GraphQLError('Cannot start a conversation with yourself', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      const existing = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.sellerPostId, data.sellerPostId!),
          eq(conversations.buyerId, userId)
        ),
      })
      if (existing) return existing

      const [conv] = await ctx.db
        .insert(conversations)
        .values({
          sellerPostId: data.sellerPostId!,
          buyerId: userId,
          sellerId: post.sellerId,
        })
        .returning()
      return conv
    },

    sendMessage: async (
      _: unknown,
      args: unknown,
      ctx: Context
    ) => {
      const userId = requireAuth(ctx)
      const data = validate(sendMessageSchema, args)

      const conv = await ctx.db.query.conversations.findFirst({
        where: eq(conversations.id, data.conversationId),
      })
      if (!conv) {
        throw new GraphQLError('Conversation not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }
      requireParticipant(conv, userId)

      const [msg] = await ctx.db
        .insert(messages)
        .values({
          conversationId: data.conversationId,
          senderId: userId,
          body: data.body,
        })
        .returning()

      // Publish to subscribers of this conversation
      await pubsub.publish(`${EVENTS.MESSAGE_SENT}.${data.conversationId}`, {
        messageSent: msg,
      })

      return msg
    },
  },
}
