import { gql } from '@apollo/client'

// ─── User ────────────────────────────────────────────────────────────────────

export const UPSERT_USER = gql`
  mutation UpsertUser($input: UpsertUserInput!) {
    upsertUser(input: $input) {
      id
      fullName
      email
      role
      avatarUrl
      hasPassword
      onboardingComplete
      createdAt
    }
  }
`

export const GET_ME = gql`
  query Me {
    me {
      id
      fullName
      email
      role
      avatarUrl
      hasPassword
      onboardingComplete
      createdAt
    }
  }
`

export const UPDATE_USER_ROLE = gql`
  mutation UpdateUserRole($input: UpsertUserInput!) {
    upsertUser(input: $input) {
      id
      role
      onboardingComplete
    }
  }
`

// ─── Seller posts (properties) ───────────────────────────────────────────────

export const SELLER_POST_FIELDS = gql`
  fragment SellerPostFields on SellerPost {
    id
    title
    description
    locationText
    lat
    lng
    propertyType
    price
    bedrooms
    bathrooms
    areaSqm
    yearBuilt
    condition
    floor
    totalFloors
    hasBalcony
    hasCentralHeating
    amenities
    images
    isActive
    createdAt
    seller {
      id
      fullName
      avatarUrl
    }
  }
`

export const GET_SELLER_POSTS = gql`
  ${SELLER_POST_FIELDS}
  query SellerPosts($limit: Int, $offset: Int, $filters: SellerPostFilters) {
    sellerPosts(limit: $limit, offset: $offset, filters: $filters) {
      ...SellerPostFields
    }
  }
`

export const SEARCH_SELLER_POSTS = gql`
  ${SELLER_POST_FIELDS}
  query SellerPostSearch(
    $limit: Int
    $offset: Int
    $filters: SellerPostFilters
    $search: String
    $district: String
    $municipality: String
    $bounds: MapBoundsInput
    $sort: SellerPostSort
  ) {
    sellerPostSearch(limit: $limit, offset: $offset, filters: $filters, search: $search, district: $district, municipality: $municipality, bounds: $bounds, sort: $sort) {
      items { ...SellerPostFields }
      totalCount
      hasNextPage
    }
  }
`

export const GET_MY_SELLER_POSTS = gql`
  ${SELLER_POST_FIELDS}
  query MySellerPosts {
    mySellerPosts {
      ...SellerPostFields
    }
  }
`

export const GET_SELLER_POST = gql`
  ${SELLER_POST_FIELDS}
  query SellerPost($id: ID!) {
    sellerPost(id: $id) {
      ...SellerPostFields
    }
  }
`

export const CREATE_SELLER_POST = gql`
  ${SELLER_POST_FIELDS}
  mutation CreateSellerPost($input: CreateSellerPostInput!) {
    createSellerPost(input: $input) {
      ...SellerPostFields
    }
  }
`

export const UPDATE_SELLER_POST = gql`
  ${SELLER_POST_FIELDS}
  mutation UpdateSellerPost($id: ID!, $input: UpdateSellerPostInput!) {
    updateSellerPost(id: $id, input: $input) {
      ...SellerPostFields
    }
  }
`

export const DEACTIVATE_SELLER_POST = gql`
  mutation DeactivateSellerPost($id: ID!) {
    deactivateSellerPost(id: $id) {
      id
      isActive
    }
  }
`

export const REACTIVATE_SELLER_POST = gql`
  mutation ReactivateSellerPost($id: ID!) {
    reactivateSellerPost(id: $id) { id isActive }
  }
`

// ─── Buyer posts (criteria) ──────────────────────────────────────────────────

export const BUYER_POST_FIELDS = gql`
  fragment BuyerPostFields on BuyerPost {
    id
    title
    description
    locationText
    lat
    lng
    radiusKm
    propertyType
    priceMin
    priceMax
    bedroomsMin
    bathroomsMin
    areaSqmMin
    yearBuiltMin
    conditions
    floorMin
    floorMax
    requiresBalcony
    requiresCentralHeating
    requiredAmenities
    isActive
    createdAt
    buyer {
      id
      fullName
      avatarUrl
    }
  }
`

export const GET_BUYER_POSTS = gql`
  ${BUYER_POST_FIELDS}
  query BuyerPosts($limit: Int, $offset: Int, $filters: BuyerPostFilters) {
    buyerPosts(limit: $limit, offset: $offset, filters: $filters) {
      ...BuyerPostFields
    }
  }
`

export const SEARCH_BUYER_POSTS = gql`
  ${BUYER_POST_FIELDS}
  query BuyerPostSearch(
    $limit: Int
    $offset: Int
    $filters: BuyerPostFilters
    $search: String
    $bounds: MapBoundsInput
    $sort: BuyerPostSort
  ) {
    buyerPostSearch(limit: $limit, offset: $offset, filters: $filters, search: $search, bounds: $bounds, sort: $sort) {
      items { ...BuyerPostFields }
      totalCount
      hasNextPage
    }
  }
`

export const GET_MY_BUYER_POSTS = gql`
  ${BUYER_POST_FIELDS}
  query MyBuyerPosts {
    myBuyerPosts {
      ...BuyerPostFields
    }
  }
`

export const GET_BUYER_POST = gql`
  ${BUYER_POST_FIELDS}
  query BuyerPost($id: ID!) {
    buyerPost(id: $id) {
      ...BuyerPostFields
    }
  }
`

export const CREATE_BUYER_POST = gql`
  ${BUYER_POST_FIELDS}
  mutation CreateBuyerPost($input: CreateBuyerPostInput!) {
    createBuyerPost(input: $input) {
      ...BuyerPostFields
    }
  }
`

export const UPDATE_BUYER_POST = gql`
  ${BUYER_POST_FIELDS}
  mutation UpdateBuyerPost($id: ID!, $input: UpdateBuyerPostInput!) {
    updateBuyerPost(id: $id, input: $input) {
      ...BuyerPostFields
    }
  }
`

export const DEACTIVATE_BUYER_POST = gql`
  mutation DeactivateBuyerPost($id: ID!) {
    deactivateBuyerPost(id: $id) {
      id
      isActive
    }
  }
`

export const REACTIVATE_BUYER_POST = gql`
  mutation ReactivateBuyerPost($id: ID!) {
    reactivateBuyerPost(id: $id) { id isActive }
  }
`

// ─── Matching and conversations ─────────────────────────────────────────────

export const MATCHING_SELLER_POSTS = gql`
  ${SELLER_POST_FIELDS}
  query MatchingSellerPosts($buyerPostId: ID!) {
    matchingSellerPosts(buyerPostId: $buyerPostId) { ...SellerPostFields }
  }
`

export const MATCHING_BUYER_POSTS = gql`
  ${BUYER_POST_FIELDS}
  query MatchingBuyerPosts($sellerPostId: ID!) {
    matchingBuyerPosts(sellerPostId: $sellerPostId) { ...BuyerPostFields }
  }
`

export const CONVERSATION_FIELDS = gql`
  fragment ConversationFields on Conversation {
    id
    createdAt
    buyer { id fullName avatarUrl }
    seller { id fullName avatarUrl }
    buyerPost { id title }
    sellerPost { id title images }
  }
`

export const MESSAGE_FIELDS = gql`
  fragment MessageFields on Message {
    id
    body
    createdAt
    sender { id fullName avatarUrl }
  }
`

export const GET_MY_CONVERSATIONS = gql`
  ${CONVERSATION_FIELDS}
  ${MESSAGE_FIELDS}
  query MyConversations($limit: Int!, $offset: Int!) {
    myConversations(limit: $limit, offset: $offset) {
      ...ConversationFields
      messages(limit: 1) { ...MessageFields }
    }
  }
`

export const GET_CONVERSATION = gql`
  ${CONVERSATION_FIELDS}
  ${MESSAGE_FIELDS}
  query Conversation($id: ID!) {
    conversation(id: $id) {
      ...ConversationFields
      messages(limit: 100) { ...MessageFields }
    }
  }
`

export const GET_OLDER_MESSAGES = gql`
  ${MESSAGE_FIELDS}
  query OlderMessages($id: ID!, $before: String!) {
    conversation(id: $id) {
      id
      messages(limit: 100, before: $before) { ...MessageFields }
    }
  }
`

export const START_CONVERSATION = gql`
  ${CONVERSATION_FIELDS}
  mutation StartConversation($input: StartConversationInput!) {
    startConversation(input: $input) { ...ConversationFields }
  }
`

export const SEND_MESSAGE = gql`
  mutation SendMessage($conversationId: ID!, $body: String!) {
    sendMessage(conversationId: $conversationId, body: $body) {
      id body createdAt sender { id fullName avatarUrl }
    }
  }
`

export const MESSAGE_SENT = gql`
  subscription MessageSent($conversationId: ID!) {
    messageSent(conversationId: $conversationId) {
      id body createdAt sender { id fullName avatarUrl }
    }
  }
`
