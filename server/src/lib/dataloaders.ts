import DataLoader from 'dataloader'
import { eq, inArray } from 'drizzle-orm'
import type { DB } from '../db/index.js'
import { users, sellerPosts, buyerPosts } from '../db/schema.js'
import type { User, SellerPost, BuyerPost } from '../db/schema.js'

// ─── Factory ────────────────────────────────────────────────────────────────────
// Create a fresh set of DataLoaders per request to avoid cross-request caching.

export function createLoaders(db: DB) {
  return {
    user: new DataLoader<string, User | null>(async (ids) => {
      const rows = await db
        .select()
        .from(users)
        .where(inArray(users.id, [...ids]))
      const byId = new Map(rows.map((r) => [r.id, r]))
      return ids.map((id) => byId.get(id) ?? null)
    }),

    sellerPost: new DataLoader<string, SellerPost | null>(async (ids) => {
      const rows = await db
        .select()
        .from(sellerPosts)
        .where(inArray(sellerPosts.id, [...ids]))
      const byId = new Map(rows.map((r) => [r.id, r]))
      return ids.map((id) => byId.get(id) ?? null)
    }),

    buyerPost: new DataLoader<string, BuyerPost | null>(async (ids) => {
      const rows = await db
        .select()
        .from(buyerPosts)
        .where(inArray(buyerPosts.id, [...ids]))
      const byId = new Map(rows.map((r) => [r.id, r]))
      return ids.map((id) => byId.get(id) ?? null)
    }),
  }
}

export type Loaders = ReturnType<typeof createLoaders>
