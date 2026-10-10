import { describe, expect, it, vi } from 'vitest'
import { conversationResolvers } from './conversation.js'
import type { Context } from '../../context.js'
import type { Conversation, Message } from '../../db/schema.js'

const owner = '123e4567-e89b-12d3-a456-426614174000'
const other = '123e4567-e89b-12d3-a456-426614174001'
const conversation = {
  id: '123e4567-e89b-12d3-a456-426614174002',
  buyerId: owner,
  sellerId: other,
  createdAt: new Date('2026-10-10T12:00:00.000Z'),
} as Conversation

function context() {
  const findMessages = vi.fn().mockResolvedValue([
    { id: '123e4567-e89b-12d3-a456-426614174004', createdAt: new Date('2026-10-10T12:02:00.000Z') },
    { id: '123e4567-e89b-12d3-a456-426614174003', createdAt: new Date('2026-10-10T12:01:00.000Z') },
  ])
  const findConversations = vi.fn().mockResolvedValue([])
  const ctx = {
    userId: owner,
    db: { query: { messages: { findMany: findMessages }, conversations: { findMany: findConversations } } },
  } as unknown as Context
  return { ctx, findMessages, findConversations }
}

describe('bounded conversation reads', () => {
  it('loads a bounded, chronological message page for a participant', async () => {
    const { ctx, findMessages } = context()
    const page = await conversationResolvers.Conversation.messages(conversation, {}, ctx)
    expect(findMessages).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }))
    expect(page.map(message => message.id)).toEqual([
      '123e4567-e89b-12d3-a456-426614174003',
      '123e4567-e89b-12d3-a456-426614174004',
    ])
    expect(conversationResolvers.Message.createdAt(page[0] as Message)).toBe('2026-10-10T12:01:00.000Z')
    expect(conversationResolvers.Conversation.createdAt(conversation)).toBe('2026-10-10T12:00:00.000Z')
    await expect(conversationResolvers.Conversation.messages(conversation, {
      limit: 10,
      before: '2026-10-10T12:01:00.000Z|123e4567-e89b-12d3-a456-426614174003',
    }, ctx)).resolves.toHaveLength(2)
    expect(findMessages).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 10 }))
  })

  it('rejects oversized pages, malformed cursors, and nonparticipants', async () => {
    const { ctx, findMessages } = context()
    await expect(conversationResolvers.Conversation.messages(conversation, { limit: 101 }, ctx))
      .rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } })
    await expect(conversationResolvers.Conversation.messages(conversation, { before: 'bad' }, ctx))
      .rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } })
    await expect(conversationResolvers.Conversation.messages(conversation, {}, { ...ctx, userId: 'third-party' }))
      .rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } })
    expect(findMessages).not.toHaveBeenCalled()
  })

  it('caps the conversation list and validates offsets', async () => {
    const { ctx, findConversations } = context()
    await conversationResolvers.Query.myConversations(null, {}, ctx)
    expect(findConversations).toHaveBeenCalledWith(expect.objectContaining({ limit: 30, offset: 0 }))
    expect(() => conversationResolvers.Query.myConversations(null, { limit: 101 }, ctx))
      .toThrowError(expect.objectContaining({ extensions: { code: 'BAD_USER_INPUT' } }))
    expect(() => conversationResolvers.Query.myConversations(null, { offset: -1 }, ctx))
      .toThrowError(expect.objectContaining({ extensions: { code: 'BAD_USER_INPUT' } }))
  })
})
