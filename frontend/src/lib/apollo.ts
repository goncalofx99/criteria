import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { setContext } from '@apollo/client/link/context'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'
import { supabase } from './supabase'

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL
const graphqlWsUrl = import.meta.env.VITE_GRAPHQL_WS_URL

if (!graphqlUrl || !graphqlWsUrl) {
  throw new Error(
    'Missing GraphQL environment variables. Ensure VITE_GRAPHQL_URL and VITE_GRAPHQL_WS_URL are set.'
  )
}

const httpLink = new HttpLink({
  uri: graphqlUrl,
})

// ─── Cached token for the auth link ────────────────────────────────────────────
// getSession() reads from storage + may refresh tokens, which is expensive to
// call on every GraphQL request. We cache the token and update it reactively
// via onAuthStateChange, so the auth link becomes synchronous in the hot path.

let cachedToken: string | null = null

// Eagerly prime the cache from the current session
supabase.auth.getSession().then(({ data: { session } }) => {
  cachedToken = session?.access_token ?? null
})

// Keep the cache in sync whenever the session changes (login, logout, refresh)
supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? null
})

const authLink = setContext((_, { headers }) => {
  // Synchronous — no await, no storage read
  return {
    headers: {
      ...headers,
      ...(cachedToken ? { authorization: `Bearer ${cachedToken}` } : {}),
    },
  }
})

const wsLink = new GraphQLWsLink(
  createClient({
    url: graphqlWsUrl,
    connectionParams: async () => {
      // WS connections are rare (only on subscribe), so getSession() is acceptable
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}
    },
  }),
)

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query)
    return def.kind === 'OperationDefinition' && def.operation === 'subscription'
  },
  wsLink,
  authLink.concat(httpLink),
)

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
})
