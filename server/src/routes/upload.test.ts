import { describe, expect, it, vi } from 'vitest'
import { S3Client } from '@aws-sdk/client-s3'

const owner = '123e4567-e89b-12d3-a456-426614174000'

vi.mock('../lib/env.js', () => ({ env: {
  R2_BUCKET: 'test-bucket',
  R2_PUBLIC_URL: 'https://cdn.example.test',
} }))
vi.mock('../middleware/auth.js', () => ({
  verifyJwt: vi.fn(async (token: string) => token === 'valid' ? owner : null),
}))
vi.mock('../lib/r2.js', () => ({
  r2: new S3Client({
    region: 'auto',
    endpoint: 'https://example.r2.cloudflarestorage.com',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  }),
}))

import { uploadRoutes } from './upload.js'

function presign(body: Record<string, unknown>) {
  return uploadRoutes.request('http://localhost/upload/presign', {
    method: 'POST',
    headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('image upload presigning', () => {
  const base = { key: `posts/${owner}/photo.webp`, contentType: 'image/webp' }

  it('signs the validated exact byte length into the PUT URL', async () => {
    const response = await presign({ ...base, size: 2048 })
    expect(response.status).toBe(200)
    const { uploadUrl, publicUrl } = await response.json()
    const url = new URL(uploadUrl)
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-length')
    expect(publicUrl).toBe(`https://cdn.example.test/${base.key}`)
  })

  it.each([0, -1, 1.5, 10 * 1024 * 1024 + 1, '2048', null])(
    'rejects invalid or excessive image size %s', async (size) => {
      expect((await presign({ ...base, size })).status).toBe(400)
    },
  )

  it('rejects unsupported media and another account\'s namespace', async () => {
    expect((await presign({ ...base, contentType: 'image/gif', size: 2048 })).status).toBe(400)
    expect((await presign({ key: 'posts/00000000-0000-0000-0000-000000000000/photo.webp', contentType: 'image/webp', size: 2048 })).status).toBe(400)
  })
})
