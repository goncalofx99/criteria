import { gql } from '@apollo/client'

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
