import { getAccessToken } from './auth'
import { reviewMode } from '@/review/mode'
import { buildUploadKey, validateUploadImage } from './uploadKey'

const API_URL = import.meta.env.VITE_API_URL
const MAX_IMAGE_DIMENSION = 2000

/** Canvas encoding removes camera metadata, including embedded GPS coordinates. */
async function prepareImage(file: File): Promise<Blob> {
  validateUploadImage(file)

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('This photo could not be read. Choose another image.')
  }

  try {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This photo could not be prepared. Choose another image.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const targetType = file.type === 'image/gif' ? 'image/png' : file.type
    const prepared = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, targetType, 0.88)
    })
    if (!prepared) throw new Error('This photo could not be prepared. Choose another image.')
    validateUploadImage(prepared)
    return prepared
  } finally {
    bitmap.close()
  }
}

/**
 * Upload a file to R2 via presigned URL.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(file: File, keyPrefix: string): Promise<string> {
  const prepared = await prepareImage(file)
  if (reviewMode) return URL.createObjectURL(prepared)
  const { key, contentType } = buildUploadKey(prepared, keyPrefix)

  // 1. Get presigned URL from our server
  const token = getAccessToken()
  const res = await fetch(`${API_URL}/upload/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ key, contentType }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(data.error || 'Failed to get upload URL')
  }

  const { uploadUrl, publicUrl } = await res.json()

  // 2. Upload directly to R2
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: prepared,
  })

  if (!uploadRes.ok) {
    throw new Error('Failed to upload file')
  }

  return publicUrl
}
