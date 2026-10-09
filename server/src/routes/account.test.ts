import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  accountActionTokens,
  accountDeletionJobs,
  conversations,
  passwordResetTokens,
  sessions,
  users,
} from '../db/schema.js'

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  findAction: vi.fn(),
  transaction: vi.fn(),
  deleteRows: vi.fn(),
  insertRows: vi.fn(),
  verifyJwt: vi.fn(),
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  cleanup: vi.fn(),
}))

vi.mock('../db/index.js', () => ({
  db: {
    query: {
      users: { findFirst: mocks.findUser },
      accountActionTokens: { findFirst: mocks.findAction },
    },
    transaction: mocks.transaction,
    delete: mocks.deleteRows,
    insert: mocks.insertRows,
  },
}))
vi.mock('../middleware/auth.js', () => ({ verifyJwt: mocks.verifyJwt }))
vi.mock('@node-rs/argon2', () => ({
  verify: mocks.verifyPassword,
  hash: mocks.hashPassword,
}))
vi.mock('../lib/accountDeletion.js', () => ({ runAccountDeletionCleanup: mocks.cleanup }))
vi.mock('../lib/env.js', () => ({ env: {
  RESEND_API_KEY: 'test-key',
  PASSWORD_RESET_FROM: 'security@example.test',
  FRONTEND_URL: 'https://criteria.example.test',
} }))

import { accountRoutes } from './account.js'

const id = '123e4567-e89b-12d3-a456-426614174000'
const user = { id, email: 'owner@example.test', passwordHash: 'stored-hash', authVersion: 0 }

function post(path: string, body: Record<string, unknown>, authenticated = true) {
  return accountRoutes.request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authenticated ? { Authorization: 'Bearer test-token' } : {}),
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.verifyJwt.mockResolvedValue(id)
  mocks.findUser.mockResolvedValue(user)
  mocks.verifyPassword.mockResolvedValue(true)
  mocks.hashPassword.mockResolvedValue('new-hash')
  mocks.cleanup.mockResolvedValue(undefined)
})
afterEach(() => vi.unstubAllGlobals())

describe('account security routes', () => {
  it('requires authentication for account changes', async () => {
    for (const path of [
      '/auth/account/password',
      '/auth/account/email/request',
      '/auth/account/delete/request',
    ]) {
      const response = await post(path, {}, false)
      expect(response.status).toBe(401)
    }
    expect(mocks.findUser).not.toHaveBeenCalled()
  })

  it('never changes a password without the current password', async () => {
    mocks.verifyPassword.mockResolvedValue(false)
    const response = await post('/auth/account/password', {
      currentPassword: 'wrong', newPassword: 'a-new-password',
    })
    expect(response.status).toBe(401)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('revokes sessions and pending account links with a password change', async () => {
    const operations: unknown[] = []
    mocks.transaction.mockImplementation(async (callback) => callback({
      update: (table: unknown) => {
        operations.push(table)
        return { set: () => ({ where: () => ({ returning: async () => [user] }) }) }
      },
      delete: (table: unknown) => {
        operations.push(table)
        return { where: async () => undefined }
      },
    }))
    const response = await post('/auth/account/password', {
      currentPassword: 'correct-password', newPassword: 'a-new-password',
    })
    expect(response.status).toBe(200)
    expect(operations).toEqual([users, sessions, passwordResetTokens, accountActionTokens])
  })

  it('does not let a second request overwrite a concurrent password change', async () => {
    const deleteRows = vi.fn()
    mocks.transaction.mockImplementation(async (callback) => callback({
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) }),
      delete: deleteRows,
    }))
    const response = await post('/auth/account/password', {
      currentPassword: 'old-password', newPassword: 'second-password',
    })
    expect(response.status).toBe(409)
    expect(deleteRows).not.toHaveBeenCalled()
  })

  it('requires the current password before sending an account-deletion link', async () => {
    mocks.verifyPassword.mockResolvedValue(false)
    const response = await post('/auth/account/delete/request', { password: 'wrong' })
    expect(response.status).toBe(401)
    expect(mocks.findAction).not.toHaveBeenCalled()
  })

  it('sends email-change approval to the current address before any account update', async () => {
    mocks.findUser.mockResolvedValueOnce(user).mockResolvedValueOnce(null)
    mocks.findAction.mockResolvedValue(null)
    mocks.deleteRows.mockReturnValue({ where: async () => undefined })
    mocks.insertRows.mockReturnValue({ values: () => ({ returning: async () => [{ id: 'link-id' }] }) })
    const fetchEmail = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchEmail)

    const response = await post('/auth/account/email/request', { email: 'new@example.test' })
    expect(response.status).toBe(200)
    const email = JSON.parse(fetchEmail.mock.calls[0][1].body)
    expect(email.to).toEqual(['owner@example.test'])
    expect(email.text).toContain('new@example.test')
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('does not claim to request a different email while a recent change is pending', async () => {
    mocks.findUser.mockResolvedValueOnce(user).mockResolvedValueOnce(null)
    mocks.findAction.mockResolvedValue({ targetEmail: 'first@example.test' })
    const response = await post('/auth/account/email/request', { email: 'second@example.test' })
    expect(response.status).toBe(429)
    expect(mocks.insertRows).not.toHaveBeenCalled()
  })

  it('commits a verified new address and revokes sessions in one transaction', async () => {
    const operations: unknown[] = []
    mocks.transaction.mockImplementation(async (callback) => callback({
      delete: (table: unknown) => {
        operations.push(table)
        if (table === accountActionTokens) {
          return { where: () => ({ returning: async () => [{ userId: id, targetEmail: 'new@example.test' }] }) }
        }
        return { where: async () => undefined }
      },
      update: (table: unknown) => {
        operations.push(table)
        return { set: () => ({ where: () => ({ returning: async () => [{ ...user, email: 'new@example.test' }] }) }) }
      },
    }))
    const response = await post('/auth/account/email/confirm-new', { token: 'A'.repeat(43) }, false)
    expect(response.status).toBe(200)
    expect(operations).toEqual([
      accountActionTokens, users, sessions, passwordResetTokens, accountActionTokens,
    ])
  })

  it('removes conversations before the user and queues owned-object erasure', async () => {
    const operations: unknown[] = []
    mocks.transaction.mockImplementation(async (callback) => callback({
      delete: (table: unknown) => {
        operations.push(table)
        if (table === accountActionTokens) {
          return { where: () => ({ returning: async () => [{ userId: id }] }) }
        }
        if (table === users) {
          return { where: () => ({ returning: async () => [user] }) }
        }
        return { where: async () => undefined }
      },
      insert: (table: unknown) => {
        operations.push(table)
        return { values: async () => undefined }
      },
    }))
    const response = await post('/auth/account/delete/confirm', { token: 'A'.repeat(43) }, false)
    expect(response.status).toBe(200)
    expect(operations).toEqual([accountActionTokens, conversations, accountDeletionJobs, users])
    expect(mocks.cleanup).toHaveBeenCalledWith(id)
  })

  it('does not delete an account for an invalid link', async () => {
    const response = await post('/auth/account/delete/confirm', { token: 'short' }, false)
    expect(response.status).toBe(400)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
