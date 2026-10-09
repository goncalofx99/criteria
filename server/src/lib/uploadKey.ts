export function validUploadKey(userId: string, key: string, contentType: string): boolean {
  const match = /^(avatars|posts)\/([0-9a-f-]{36})\/([A-Za-z0-9_-]{1,80})\.(jpe?g|png|webp|gif)$/i.exec(key)
  if (!match || match[2].toLowerCase() !== userId.toLowerCase()) return false
  const extension = match[4].toLowerCase()
  const expectedType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`
  return contentType === expectedType
}

function validPublicImageUrl(userId: string, imageUrl: string, publicBaseUrl: string, namespace: 'posts' | 'avatars'): boolean {
  if (!publicBaseUrl) return false
  // Use the exact URL format returned by /upload/presign. A URL on another
  // host, another owner's path, or with query/fragment data is not accepted.
  const prefix = `${publicBaseUrl}/${namespace}/`
  if (!imageUrl.startsWith(prefix)) return false
  let base: URL
  let image: URL
  try {
    base = new URL(publicBaseUrl)
    image = new URL(imageUrl)
  } catch {
    return false
  }
  if (base.search || base.hash || base.username || base.password ||
      image.origin !== base.origin || image.search || image.hash || image.username || image.password) return false

  const key = imageUrl.slice(publicBaseUrl.length + 1)
  const extension = /\.([a-z]+)$/i.exec(key)?.[1]?.toLowerCase()
  const contentType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`
  return key.startsWith(`${namespace}/`) && validUploadKey(userId, key, contentType)
}

export function validSellerImageUrl(userId: string, imageUrl: string, publicBaseUrl: string): boolean {
  return validPublicImageUrl(userId, imageUrl, publicBaseUrl, 'posts')
}

export function validAvatarUrl(userId: string, imageUrl: string, publicBaseUrl: string): boolean {
  return validPublicImageUrl(userId, imageUrl, publicBaseUrl, 'avatars')
}
