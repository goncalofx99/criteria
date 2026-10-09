import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '../../context.js'
import type { Message } from '../../db/schema.js'

import { subscriptionResolvers } from './subscription.js'

const owner = '123e4567-e89b-12d3-a456-426614174000'
const conversationId = '123e4567-e89b-12d3-a456-426614174001'
const message = { conversationId, body: 'Private message' } as Message
const findConversation = vi.fn()
const revalidateAuth = vi.fn()
const ctx = {
  userId: owner,
  revalidateAuth,
  db: { query: { conversations: { findFirst: findConversation } } },
} as unknown as Context

beforeEach(() => {
  vi.clearAllMocks()
  revalidateAuth.mockResolvedValue(owner)
  findConversation.mockResolvedValue({ id: conversationId, buyerId: owner, sellerId: 'another-user' })
})

describe('message subscription event authorization', () => {
  it('delivers a message while the original token and participation remain valid', async () => {
    await expect(subscriptionResolvers.Subscription.messageSent.resolve({ messageSent: message }, null, ctx))
      .resolves.toBe(message)
  })

  it('stops delivery after the original access token is revoked or expires', async () => {
    revalidateAuth.mockResolvedValue(null)
    await expect(subscriptionResolvers.Subscription.messageSent.resolve({ messageSent: message }, null, ctx))
      .rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } })
    expect(findConversation).not.toHaveBeenCalled()
  })

  it('stops delivery after the conversation is removed or membership changes', async () => {
    findConversation.mockResolvedValue(null)
    await expect(subscriptionResolvers.Subscription.messageSent.resolve({ messageSent: message }, null, ctx))
      .rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } })
    findConversation.mockResolvedValue({ id: conversationId, buyerId: 'third', sellerId: 'fourth' })
    await expect(subscriptionResolvers.Subscription.messageSent.resolve({ messageSent: message }, null, ctx))
      .rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } })
  })
})
