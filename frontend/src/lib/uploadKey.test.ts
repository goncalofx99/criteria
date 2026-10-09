import { describe, expect, it } from 'vitest'
import { buildUploadKey, validateUploadImage } from './uploadKey'

const owner = '3c9b7cd0-2d4b-4932-8122-f8cc44acfd21'

describe('R2 upload key preparation', () => {
  it('matches the server namespace and MIME/extension contract', () => {
    const jpeg = { type: 'image/jpeg', size: 1024 }
    expect(buildUploadKey(jpeg, `posts/${owner}`, '8e65d8d4-86d5-47c3-b210-df9a8c4ecc39', 42)).toEqual({
      key: `posts/${owner}/42-8e65d8d4-86d5-47c3-b210-df9a8c4ecc39.jpg`,
      contentType: 'image/jpeg',
    })
    expect(buildUploadKey({ type: 'image/webp', size: 50 }, `avatars/${owner}`, 'id', 43).key).toBe(`avatars/${owner}/43-id.webp`)
  })

  it('rejects unsupported media, oversized files and other users’ upload paths', () => {
    expect(() => validateUploadImage({ type: 'image/heic', size: 10 })).toThrow(/JPEG/)
    expect(() => validateUploadImage({ type: 'image/gif', size: 10 })).toThrow(/JPEG/)
    expect(() => validateUploadImage({ type: 'image/png', size: 10 * 1024 * 1024 + 1 })).toThrow(/10 MB/)
    expect(() => buildUploadKey({ type: 'image/png', size: 100 }, 'posts/other-user', 'id', 1)).toThrow(/destination/)
  })
})
