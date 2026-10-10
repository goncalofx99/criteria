import { GraphQLError } from 'graphql'
import { eq, or, and, desc, lt } from 'drizzle-orm'
import { conversations, messages, buyerPosts, sellerPosts, users } from '../../db/schema.js'
import { validate, startConversationSchema, sendMessageSchema } from '../../lib/validate.js'
import { consumeAbuseBudget } from '../../lib/abuseBudget.js'
import { pubsub, EVENTS } from '../../lib/pubsub.js'
import type { Context } from '../../context.js'
import type { Conversation, Message } from '../../db/schema.js'

const MAX_CONVERSATION_PAGE = 100
const DEFAULT_CONVERSATION_PAGE = 30
const MAX_MESSAGE_PAGE = 100
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function pageSize(value: number | null | undefined, fallback: number, maximum: number): number {
  if (value == null) return fallback
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new GraphQLError(`Page size must be between 1 and ${maximum}`, {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }
  return value
}

function messageCursor(value: string | null | undefined): { createdAt: Date; id: string } | null {
  if (value == null) return null
  const [timestamp, id, extra] = value.split('|')
  const createdAt = new Date(timestamp)
  if (extra !== undefined || !UUID.test(id ?? '') || !/^\d{4}-\d\d-\d\dT/.test(timestamp ?? '') ||
      !Number.isFinite(createdAt.getTime()) || createdAt.toISOString() !== timestamp) {
    throw new GraphQLError('Invalid message cursor', { extensions: { code: 'BAD_USER_INPUT' } })
  }
  return { createdAt, id }
}

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

async function requireConversationRole(ctx: Context, userId: string, role: 'buyer' | 'seller') {
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, userId), columns: { role: true, onboardingCompletedAt: true },
  })
  if (!user?.onboardingCompletedAt || (user.role !== role && user.role !== 'both')) {
    throw new GraphQLError('Your account role cannot contact this post', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
}

export const conversationResolvers = {
  Conversation: {
    createdAt: (c: Conversation) => c.createdAt.toISOString(),
    buyer: (c: Conversation, _: unknown, ctx: Context) =>
      ctx.loaders.user.load(c.buyerId),
    seller: (c: Conversation, _: unknown, ctx: Context) =>
      ctx.loaders.user.load(c.sellerId),
    buyerPost: (c: Conversation, _: unknown, ctx: Context) =>
      c.buyerPostId ? ctx.loaders.buyerPost.load(c.buyerPostId) : null,
    sellerPost: (c: Conversation, _: unknown, ctx: Context) =>
      c.sellerPostId ? ctx.loaders.sellerPost.load(c.sellerPostId) : null,
    messages: async (c: Conversation, args: { limit?: number | null; before?: string | null }, ctx: Context) => {
      requireParticipant(c, requireAuth(ctx))
      const limit = pageSize(args.limit, MAX_MESSAGE_PAGE, MAX_MESSAGE_PAGE)
      const before = messageCursor(args.before)
      const page = await ctx.db.query.messages.findMany({
        where: and(
          eq(messages.conversationId, c.id),
          before ? or(
            lt(messages.createdAt, before.createdAt),
            and(eq(messages.createdAt, before.createdAt), lt(messages.id, before.id)),
          ) : undefined,
        ),
        orderBy: (m) => [desc(m.createdAt), desc(m.id)],
        limit,
      })
      return page.reverse()
    },
  },

  Message: {
    createdAt: (m: Message) => m.createdAt.toISOString(),
    sender: (m: Message, _: unknown, ctx: Context) =>
      ctx.loaders.user.load(m.senderId),
  },

  Query: {
    myConversations: (_: unknown, args: { limit?: number | null; offset?: number | null }, ctx: Context) => {
      const userId = requireAuth(ctx)
      const limit = pageSize(args.limit, DEFAULT_CONVERSATION_PAGE, MAX_CONVERSATION_PAGE)
      const offset = args.offset ?? 0
      if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) {
        throw new GraphQLError('Invalid conversation offset', { extensions: { code: 'BAD_USER_INPUT' } })
      }
      return ctx.db.query.conversations.findMany({
        where: or(
          eq(conversations.buyerId, userId),
          eq(conversations.sellerId, userId)
        ),
        orderBy: (c) => [desc(c.createdAt), desc(c.id)],
        limit,
        offset,
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
        await requireConversationRole(ctx, userId, 'seller')
        const post = await ctx.db.query.buyerPosts.findFirst({
          where: eq(buyerPosts.id, data.buyerPostId),
        })
        if (!post || !post.isActive) {
          throw new GraphQLError('Criteria post not found or inactive', {
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
      await requireConversationRole(ctx, userId, 'buyer')
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

      const retryAfter = consumeAbuseBudget(`message:${userId}`, 12, 60_000)
      if (retryAfter > 0) {
        throw new GraphQLError(`Too many messages. Try again in ${retryAfter} seconds.`, {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

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
