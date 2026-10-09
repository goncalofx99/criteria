const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
}

export function validateUploadImage(file: Pick<File, 'type' | 'size'>): { contentType: string; extension: string } {
  const extension = EXTENSIONS[file.type]
  if (!extension) throw new Error('Choose a JPEG, PNG or WebP image')
  if (file.size > 10 * 1024 * 1024) throw new Error('Images must be 10 MB or smaller')
  return { contentType: file.type, extension }
}

export function buildUploadKey(file: Pick<File, 'type' | 'size'>, keyPrefix: string, id: string = crypto.randomUUID(), timestamp = Date.now()): { key: string; contentType: string } {
  const { contentType, extension } = validateUploadImage(file)
  if (!/^(avatars|posts)\/[0-9a-f-]{36}$/i.test(keyPrefix)) throw new Error('Invalid upload destination')
  return { key: `${keyPrefix}/${timestamp}-${id}.${extension}`, contentType }
}
