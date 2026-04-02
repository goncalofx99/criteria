import { PubSub } from 'graphql-subscriptions'

// In-process pub/sub for GraphQL subscriptions.
// Fine for a single-server deployment. If we ever go multi-instance
// (e.g. Railway with horizontal scaling), swap this for a Redis-backed pubsub.
export const pubsub = new PubSub()

export const EVENTS = {
  MESSAGE_SENT: 'MESSAGE_SENT',
} as const
