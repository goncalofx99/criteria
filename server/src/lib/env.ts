import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT signing secret for our own auth tokens
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  // Public API origin registered with Google as its OAuth redirect host.
  PUBLIC_API_URL: z.string().url('PUBLIC_API_URL must be a valid URL').optional(),

  // Cloudflare R2 (S3-compatible object storage)
  R2_ACCOUNT_ID: z.string().min(1, 'R2_ACCOUNT_ID is required'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
  R2_BUCKET: z.string().min(1, 'R2_BUCKET is required'),
  R2_PUBLIC_URL: z.string().url('R2_PUBLIC_URL must be a valid URL'),

  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  // Allowed frontend origin for CORS — required in production
  FRONTEND_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  PASSWORD_RESET_FROM: z.string().email().optional(),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production' && !value.FRONTEND_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['FRONTEND_URL'], message: 'FRONTEND_URL is required in production' })
  }
  if (value.NODE_ENV === 'production') {
    for (const key of ['FRONTEND_URL', 'R2_PUBLIC_URL', 'PUBLIC_API_URL'] as const) {
      const url = value[key]
      if (url && URL.canParse(url) && new URL(url).protocol !== 'https:') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} must use HTTPS in production` })
      }
    }
  }
  if (value.PUBLIC_API_URL && URL.canParse(value.PUBLIC_API_URL)) {
    const url = new URL(value.PUBLIC_API_URL)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['PUBLIC_API_URL'], message: 'PUBLIC_API_URL must use HTTP or HTTPS' })
    }
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['PUBLIC_API_URL'], message: 'PUBLIC_API_URL must be an origin without credentials, path, query or fragment' })
    }
  }
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
