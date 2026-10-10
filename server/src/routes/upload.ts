import { Hono } from 'hono'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../lib/env.js'
import { verifyJwt } from '../middleware/auth.js'
import { validUploadKey } from '../lib/uploadKey.js'
import { r2 } from '../lib/r2.js'

// ─── Routes ───────────────────────────────────────────────────────────────────

export const uploadRoutes = new Hono()
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/**
 * POST /upload/presign
 * Body: { key: "avatars/abc.jpg", contentType: "image/jpeg", size: 12345 }
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

  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null
  const key = body?.key
  const contentType = body?.contentType
  const size = body?.size

  if (typeof key !== 'string' || typeof contentType !== 'string' ||
      typeof size !== 'number' || !Number.isSafeInteger(size) || size < 1 || size > MAX_UPLOAD_BYTES) {
    return c.json({ error: 'A valid key, content type and image size up to 10 MB are required' }, 400)
  }

  // Validate content type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(contentType)) {
    return c.json({ error: 'Invalid content type. Allowed: jpeg, png, webp' }, 400)
  }

  // Keep every object in a namespace owned by the authenticated user.
  // This also prevents replacing another user's avatar or listing images.
  if (!validUploadKey(userId, key, contentType)) {
    return c.json({ error: 'Invalid upload path' }, 400)
  }

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
    // SigV4 includes content-length in SignedHeaders, so R2 rejects a PUT
    // whose byte count differs from the validated size.
    ContentLength: size,
  })

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 }) // 5 min

  return c.json({
    uploadUrl,
    publicUrl: `${env.R2_PUBLIC_URL}/${key}`,
  })
})
