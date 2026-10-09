import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

const mocks = vi.hoisted(() => ({ send: vi.fn(), deleteJob: vi.fn() }))
vi.mock('./r2.js', () => ({ r2: { send: mocks.send } }))
vi.mock('./env.js', () => ({ env: { R2_BUCKET: 'test-bucket' } }))
vi.mock('../db/index.js', () => ({
  db: { delete: mocks.deleteJob },
}))

import { runAccountDeletionCleanup } from './accountDeletion.js'

const owner = '123e4567-e89b-12d3-a456-426614174000'
const other = '123e4567-e89b-12d3-a456-426614174001'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.deleteJob.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
})

describe('deleted-account R2 cleanup', () => {
  it('erases only owned photos, including legacy uppercase UUID paths', async () => {
    const deletedKeys: string[] = []
    mocks.send.mockImplementation(async (command) => {
      if (command instanceof ListObjectsV2Command) {
        const namespace = command.input.Prefix
        return { Contents: [
          { Key: `${namespace}${owner.toUpperCase()}/photo.webp` },
          { Key: `${namespace}${other}/photo.webp` },
        ] }
      }
      if (command instanceof DeleteObjectsCommand) {
        deletedKeys.push(...(command.input.Delete?.Objects ?? []).flatMap((object) => object.Key ? [object.Key] : []))
        return {}
      }
      throw new Error('Unexpected R2 command')
    })

    await runAccountDeletionCleanup(owner)
    expect(deletedKeys).toEqual([
      `avatars/${owner.toUpperCase()}/photo.webp`,
      `posts/${owner.toUpperCase()}/photo.webp`,
    ])
    expect(mocks.deleteJob).toHaveBeenCalledTimes(1)
  })

  it('retains the deletion job for retry after an R2 failure', async () => {
    mocks.send.mockRejectedValue(new Error('R2 unavailable'))
    await expect(runAccountDeletionCleanup(owner)).rejects.toThrow('R2 unavailable')
    expect(mocks.deleteJob).not.toHaveBeenCalled()
  })
})
