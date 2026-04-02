import { userResolvers } from './user.js'
import { sellerPostResolvers } from './sellerPost.js'
import { buyerPostResolvers } from './buyerPost.js'
import { conversationResolvers } from './conversation.js'

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...sellerPostResolvers.Query,
    ...buyerPostResolvers.Query,
    ...conversationResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...sellerPostResolvers.Mutation,
    ...buyerPostResolvers.Mutation,
    ...conversationResolvers.Mutation,
  },
  User: userResolvers.User,
  SellerPost: sellerPostResolvers.SellerPost,
  BuyerPost: buyerPostResolvers.BuyerPost,
  Conversation: conversationResolvers.Conversation,
  Message: conversationResolvers.Message,
}
