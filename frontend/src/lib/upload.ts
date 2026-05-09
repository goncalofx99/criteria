import { getAccessToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL

/**
 * Upload a file to R2 via presigned URL.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(file: File, keyPrefix: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const key = `${keyPrefix}/${Date.now()}.${ext}`
  const contentType = file.type || 'image/jpeg'

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
    body: file,
  })

  if (!uploadRes.ok) {
    throw new Error('Failed to upload file')
  }

  return publicUrl
}
