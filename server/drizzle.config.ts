import 'dotenv/config'
import type { Config } from 'drizzle-kit'

// Supabase requires two separate connection strings:
//   DATABASE_URL  — Transaction Pooler (port 6543, pgbouncer=true) used at runtime
//   MIGRATION_URL — Direct Connection  (port 5432, no pgbouncer)  used for migrations
//
// drizzle-kit uses MIGRATION_URL here. If it isn't set it falls back to
// DATABASE_URL (useful if you're running against a local Postgres that doesn't
// need a pooler).

export default {
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.MIGRATION_URL ?? process.env.DATABASE_URL!,
    ssl: true,
  },
} satisfies Config
