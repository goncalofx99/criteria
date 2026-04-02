import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Supabase project URL — used to fetch the JWKS endpoint for JWT verification.
  // Found in: Supabase dashboard → Settings → API → Project URL
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  // Legacy HS256 shared secret — optional. Only needed if you are NOT using
  // Supabase's modern ECC signing keys (e.g. in tests or older projects).
  SUPABASE_JWT_SECRET: z
    .string()
    .min(32, 'SUPABASE_JWT_SECRET must be at least 32 characters')
    .optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  // Allowed frontend origin for CORS — required in production
  FRONTEND_URL: z.string().url().optional(),
})

// Validate on startup and fail immediately if env is misconfigured.
// This prevents the server from starting in a broken state.
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌  Invalid environment variables:')
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = parsed.data
