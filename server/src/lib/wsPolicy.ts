import { getOperationAST, GraphQLError, parse } from 'graphql'

/** WebSocket transport is reserved for subscriptions; HTTP serves all other operations. */
export function subscriptionOperationError(query: string, operationName?: string | null): GraphQLError | null {
  try {
    const operation = getOperationAST(parse(query), operationName ?? undefined)
    if (operation?.operation === 'subscription') return null
  } catch {
    return new GraphQLError('Invalid GraphQL document', { extensions: { code: 'BAD_USER_INPUT' } })
  }
  return new GraphQLError('WebSocket transport accepts subscriptions only', {
    extensions: { code: 'BAD_USER_INPUT' },
  })
}

const safeCodes = new Set(['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'BAD_USER_INPUT'])

export function maskWebSocketError(error: GraphQLError, production: boolean): GraphQLError {
  if (!production || safeCodes.has(String(error.extensions.code))) return error
  return new GraphQLError('Internal server error', {
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  })
}
