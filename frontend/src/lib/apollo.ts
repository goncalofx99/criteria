import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { setContext } from '@apollo/client/link/context'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'
import { supabase } from './supabase'

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL,
})

const authLink = setContext(async (_, { headers }) => {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    headers: {
      ...headers,
      ...(session?.access_token
        ? { authorization: `Bearer ${session.access_token}` }
        : {}),
    },
  }
})

const wsLink = new GraphQLWsLink(
  createClient({
    url: import.meta.env.VITE_GRAPHQL_WS_URL,
    connectionParams: async () => {
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
