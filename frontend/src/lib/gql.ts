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
      createdAt
    }
  }
`

export const UPDATE_USER_ROLE = gql`
  mutation UpsertUser($input: UpsertUserInput!) {
    upsertUser(input: $input) {
      id
      role
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
  query SellerPosts($limit: Int, $offset: Int) {
    sellerPosts(limit: $limit, offset: $offset) {
      ...SellerPostFields
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
  query BuyerPosts($limit: Int, $offset: Int) {
    buyerPosts(limit: $limit, offset: $offset) {
      ...BuyerPostFields
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
