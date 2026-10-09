import { expect, it } from 'vitest'
import { validAvatarUrl, validSellerImageUrl, validUploadKey } from './uploadKey.js'

const owner = '123e4567-e89b-12d3-a456-426614174000'
const other = '123e4567-e89b-12d3-a456-426614174001'

it('allows a matching image key in the uploader’s namespace', () => {
  expect(validUploadKey(owner, `posts/${owner}/1720000000000.jpg`, 'image/jpeg')).toBe(true)
  expect(validUploadKey(owner, `avatars/${owner}/portrait.webp`, 'image/webp')).toBe(true)
})

it('rejects another user’s key, traversal, and mismatched content types', () => {
  expect(validUploadKey(owner, `posts/${other}/photo.jpg`, 'image/jpeg')).toBe(false)
  expect(validUploadKey(owner, `posts/${owner}/../photo.jpg`, 'image/jpeg')).toBe(false)
  expect(validUploadKey(owner, `posts/${owner}/photo.jpg`, 'image/png')).toBe(false)
  expect(validUploadKey(owner, `posts/${owner}/script.svg`, 'image/svg+xml')).toBe(false)
})

it('accepts only an owned listing image on the configured public R2 URL', () => {
  const base = 'https://cdn.example.com/criteria'
  expect(validSellerImageUrl(owner, `${base}/posts/${owner}/1720000000000.jpg`, base)).toBe(true)
  expect(validSellerImageUrl(owner, `${base}/posts/${owner}/photo.webp`, base)).toBe(true)
  expect(validSellerImageUrl(owner, `${base}/posts/${other}/photo.jpg`, base)).toBe(false)
  expect(validSellerImageUrl(owner, `https://cdn.example.com.evil/criteria/posts/${owner}/photo.jpg`, base)).toBe(false)
  expect(validSellerImageUrl(owner, `${base}/avatars/${owner}/photo.jpg`, base)).toBe(false)
  expect(validSellerImageUrl(owner, `${base}/posts/${owner}/photo.jpg?tracking=1`, base)).toBe(false)
  expect(validSellerImageUrl(owner, `${base}/posts/${owner}/photo.jpg#fragment`, base)).toBe(false)
  expect(validSellerImageUrl(owner, `${base}/posts/${owner}/%2e%2e/photo.jpg`, base)).toBe(false)
  expect(validSellerImageUrl(owner, `${base}/posts/${owner}/photo.svg`, base)).toBe(false)
  expect(validSellerImageUrl(owner, `${base}/posts/${owner}/photo.jpg`, '')).toBe(false)
})

it('requires profile images in the owner’s avatar namespace', () => {
  const base = 'https://cdn.example.com'
  expect(validAvatarUrl(owner, `${base}/avatars/${owner}/portrait.png`, base)).toBe(true)
  expect(validAvatarUrl(owner, `${base}/posts/${owner}/portrait.png`, base)).toBe(false)
  expect(validAvatarUrl(owner, `${base}/avatars/${other}/portrait.png`, base)).toBe(false)
})
