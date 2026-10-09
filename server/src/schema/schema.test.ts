import { expect, it } from 'vitest'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { typeDefs } from './typeDefs.js'
import { resolvers } from './resolvers/index.js'

it('builds the full GraphQL schema with every resolver attached', () => {
  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const query = schema.getQueryType()!
  const mutation = schema.getMutationType()!
  expect(query.getFields().sellerPostSearch).toBeDefined()
  expect(query.getFields().buyerPostSearch).toBeDefined()
  expect(mutation.getFields().reactivateSellerPost).toBeDefined()
  expect(mutation.getFields().reactivateBuyerPost).toBeDefined()
})
