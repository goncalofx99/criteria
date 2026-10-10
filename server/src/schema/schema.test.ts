import { expect, it } from 'vitest'
import type { GraphQLObjectType } from 'graphql'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { typeDefs } from './typeDefs.js'
import { resolvers } from './resolvers/index.js'

it('builds the full GraphQL schema with every resolver attached', () => {
  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const query = schema.getQueryType()!
  const mutation = schema.getMutationType()!
  expect(query.getFields().sellerPostSearch).toBeDefined()
  expect(query.getFields().sellerPostSearch.args.map((arg) => arg.name)).toContain('municipality')
  expect(query.getFields().sellerPostSearch.args.map((arg) => arg.name)).toContain('district')
  expect(query.getFields().buyerPostSearch).toBeDefined()
  expect(mutation.getFields().reactivateSellerPost).toBeDefined()
  expect(mutation.getFields().reactivateBuyerPost).toBeDefined()

  const sellerPost = schema.getType('SellerPost') as GraphQLObjectType
  expect(sellerPost.getFields().seller.type.toString()).toBe('SellerProfile!')
  const publicSeller = schema.getType('SellerProfile') as GraphQLObjectType
  expect(Object.keys(publicSeller.getFields()).sort()).toEqual(['avatarUrl', 'fullName', 'id'])
})
