import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'
import { clearLocalSession, getAccessToken, onAuthChange, refreshAccessToken } from './auth'
import { reviewMode } from '@/review/mode'
import { createReviewLink } from '@/review/link'

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL
const graphqlWsUrl = import.meta.env.VITE_GRAPHQL_WS_URL

if (!reviewMode && (!graphqlUrl || !graphqlWsUrl)) {
  throw new Error(
    'Missing GraphQL environment variables. Ensure VITE_GRAPHQL_URL and VITE_GRAPHQL_WS_URL are set.'
  )
}

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

function createLiveLink() {
  const httpLink = new HttpLink({ uri: graphqlUrl })
  const invalidSessionLink = onError(({ graphQLErrors, networkError }) => {
    const unauthenticated = graphQLErrors?.some(error => error.extensions?.code === 'UNAUTHENTICATED')
    const unauthorizedHttp = !!networkError && 'statusCode' in networkError && networkError.statusCode === 401
    if (unauthenticated || unauthorizedHttp) clearLocalSession()
  })
  const wsLink = new GraphQLWsLink(createClient({
    url: graphqlWsUrl,
    connectionParams: async () => {
      let token = getAccessToken()
      if (!token) token = await refreshAccessToken()
      return token ? { Authorization: `Bearer ${token}` } : {}
    },
  }))
  return split(({ query }) => {
    const def = getMainDefinition(query)
    return def.kind === 'OperationDefinition' && def.operation === 'subscription'
  }, wsLink, authLink.concat(invalidSessionLink).concat(httpLink))
}

export const apolloClient = new ApolloClient({
  link: reviewMode ? createReviewLink() : createLiveLink(),
  cache: new InMemoryCache(),
})

// Clear Apollo cache on sign-out
onAuthChange((token) => {
  if (!token) {
    apolloClient.clearStore()
  }
})
