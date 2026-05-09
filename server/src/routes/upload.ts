import { Hono } from 'hono'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../lib/env.js'
import { verifyJwt } from '../middleware/auth.js'

// ─── R2 Client ────────────────────────────────────────────────────────────────

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
})

// ─── Routes ───────────────────────────────────────────────────────────────────

export const uploadRoutes = new Hono()

/**
 * POST /upload/presign
 * Body: { key: "avatars/abc.jpg", contentType: "image/jpeg" }
 * Returns: { uploadUrl: "...", publicUrl: "..." }
 *
 * The frontend uploads directly to R2 via the presigned URL,
 * then stores the publicUrl in the database.
 */
uploadRoutes.post('/upload/presign', async (c) => {
  // Require auth
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const userId = await verifyJwt(authHeader.slice(7))
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const body = await c.req.json<{ key: string; contentType: string }>()
  const { key, contentType } = body

  if (!key || !contentType) {
    return c.json({ error: 'key and contentType are required' }, 400)
  }

  // Validate content type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(contentType)) {
    return c.json({ error: 'Invalid content type. Allowed: jpeg, png, webp, gif' }, 400)
  }

  // Validate key pattern (prevent path traversal)
  if (key.includes('..') || key.startsWith('/')) {
    return c.json({ error: 'Invalid key' }, 400)
  }

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 }) // 5 min

  return c.json({
    uploadUrl,
    publicUrl: `${env.R2_PUBLIC_URL}/${key}`,
  })
})
