import type { DB } from './db/index.js'
import type { Loaders } from './lib/dataloaders.js'

export type Context = {
  db: DB
  userId: string | null // Our users.id UUID, null if unauthenticated
  loaders: Loaders
}
