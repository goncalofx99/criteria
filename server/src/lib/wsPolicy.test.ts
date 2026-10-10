import { describe, expect, it } from 'vitest'
import { GraphQLError } from 'graphql'
import { maskWebSocketError, subscriptionOperationError } from './wsPolicy.js'

describe('WebSocket GraphQL policy', () => {
  it('rejects queries, mutations, and ambiguous multi-operation documents', () => {
    expect(subscriptionOperationError('query { me { id } }')?.message).toContain('subscriptions only')
    expect(subscriptionOperationError('mutation { sendMessage(conversationId: "x", body: "y") { id } }')?.message)
      .toContain('subscriptions only')
    expect(subscriptionOperationError('query Q { me { id } } subscription S { messageSent(conversationId: "x") { id } }')?.message)
      .toContain('subscriptions only')
  })

  it('allows only a selected subscription operation', () => {
    const document = 'query Q { me { id } } subscription S { messageSent(conversationId: "x") { id } }'
    expect(subscriptionOperationError(document, 'S')).toBeNull()
    expect(subscriptionOperationError(document, 'Q')).not.toBeNull()
    expect(subscriptionOperationError('subscription { messageSent(conversationId: "x") { id } }')).toBeNull()
  })

  it('masks unexpected production errors but keeps expected authorization errors', () => {
    const internal = new GraphQLError('private database detail')
    const denied = new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } })
    expect(maskWebSocketError(internal, true).message).toBe('Internal server error')
    expect(maskWebSocketError(internal, false).message).toBe('private database detail')
    expect(maskWebSocketError(denied, true)).toBe(denied)
  })
})
