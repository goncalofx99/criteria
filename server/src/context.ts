import type { DB } from './db/index.js'

export type Context = {
  db: DB
  userId: string | null // Supabase auth.users UUID, null if unauthenticated
}
