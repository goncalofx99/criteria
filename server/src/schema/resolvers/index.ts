import { userResolvers } from './user.js'
import { sellerPostResolvers } from './sellerPost.js'
import { buyerPostResolvers } from './buyerPost.js'

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...sellerPostResolvers.Query,
    ...buyerPostResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...sellerPostResolvers.Mutation,
    ...buyerPostResolvers.Mutation,
  },
  SellerPost: sellerPostResolvers.SellerPost,
  BuyerPost: buyerPostResolvers.BuyerPost,
}
