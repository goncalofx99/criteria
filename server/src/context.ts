import type { DB } from './db/index.js'
import type { Loaders } from './lib/dataloaders.js'

export type Context = {
  db: DB
  userId: string | null // Our users.id UUID, null if unauthenticated
  // Present on WebSocket subscriptions so each published event can re-check
  // revocation after the original subscribe operation was authorized.
  revalidateAuth?: () => Promise<string | null>
  loaders: Loaders
}
