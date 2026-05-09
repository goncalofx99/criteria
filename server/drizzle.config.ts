import 'dotenv/config'
import type { Config } from 'drizzle-kit'

// MIGRATION_URL = direct connection (needed for DDL operations)
// DATABASE_URL  = pooled connection (used at runtime)

export default {
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.MIGRATION_URL ?? process.env.DATABASE_URL!,
    ssl: true,
  },
} satisfies Config
