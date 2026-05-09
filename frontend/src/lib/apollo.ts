import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { setContext } from '@apollo/client/link/context'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'
import { getAccessToken, onAuthChange, refreshAccessToken } from './auth'

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

// ─── Auth link ────────────────────────────────────────────────────────────────

const authLink = setContext(async (_, { headers }) => {
  let token = getAccessToken()

  // If no token, try refreshing
  if (!token) {
    token = await refreshAccessToken()
  }

  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }
})

const wsLink = new GraphQLWsLink(
  createClient({
    url: graphqlWsUrl,
    connectionParams: async () => {
      let token = getAccessToken()
      if (!token) {
        token = await refreshAccessToken()
      }
      return token
        ? { Authorization: `Bearer ${token}` }
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

// Clear Apollo cache on sign-out
onAuthChange((token) => {
  if (!token) {
    apolloClient.clearStore()
  }
})
