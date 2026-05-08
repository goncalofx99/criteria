import type { DB } from './db/index.js'
import type { Loaders } from './lib/dataloaders.js'

export type Context = {
  db: DB
  userId: string | null // Supabase auth.users UUID, null if unauthenticated
  loaders: Loaders
}
