import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { eq, lt } from 'drizzle-orm'
import { accountActionTokens, accountDeletionJobs, passwordResetTokens, sessions } from '../db/schema.js'
import { db } from '../db/index.js'
import { env } from './env.js'
import { r2 } from './r2.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function eraseOwnedObjects(namespace: 'avatars' | 'posts', userId: string) {
  let continuationToken: string | undefined
  do {
    const result = await r2.send(new ListObjectsV2Command({
      Bucket: env.R2_BUCKET,
      // Older uploads allowed uppercase UUIDs, so scan this namespace and
      // match the owner segment case-insensitively. New uploads are canonical.
      Prefix: `${namespace}/`,
      ContinuationToken: continuationToken,
    }))
    const objects = (result.Contents ?? [])
      .flatMap((object) => {
        const key = object.Key
        const owner = key?.split('/')[1]
        return key && owner?.toLowerCase() === userId.toLowerCase() ? [{ Key: key }] : []
      })
    if (objects.length > 0) {
      const deleted = await r2.send(new DeleteObjectsCommand({
        Bucket: env.R2_BUCKET,
        Delete: { Objects: objects, Quiet: true },
      }))
      if (deleted.Errors?.length) {
        throw new Error(`R2 rejected ${deleted.Errors.length} object deletions`)
      }
    }
    continuationToken = result.NextContinuationToken
  } while (continuationToken)
}

/**
 * Account rows are deleted in a transaction with a durable cleanup job. If R2
 * is unavailable, the job remains and this function can safely run again.
 */
export async function runAccountDeletionCleanup(userId: string) {
  if (!UUID.test(userId)) throw new Error('Invalid deletion job user ID')
  await eraseOwnedObjects('avatars', userId)
  await eraseOwnedObjects('posts', userId)
  await db.delete(accountDeletionJobs).where(eq(accountDeletionJobs.userId, userId))
}

let draining = false

async function drainPendingJobs() {
  if (draining) return
  draining = true
  try {
    const pending = await db.select({ userId: accountDeletionJobs.userId })
      .from(accountDeletionJobs)
      .orderBy(accountDeletionJobs.createdAt)
    for (const job of pending) {
      try {
        await runAccountDeletionCleanup(job.userId)
      } catch (error) {
        console.error('[Account] R2 deletion pending retry:', job.userId, error)
      }
    }
  } finally {
    draining = false
  }
}

async function runAccountMaintenance() {
  const now = new Date()
  await db.delete(accountActionTokens).where(lt(accountActionTokens.expiresAt, now))
  await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, now))
  await db.delete(sessions).where(lt(sessions.expiresAt, now))
  await drainPendingJobs()
}

export function startAccountDeletionCleanup() {
  void runAccountMaintenance().catch((error) => console.error('[Account] maintenance failed:', error))
  const timer = setInterval(() => {
    void runAccountMaintenance().catch((error) => console.error('[Account] maintenance failed:', error))
  }, 15 * 60_000)
  timer.unref()
}
