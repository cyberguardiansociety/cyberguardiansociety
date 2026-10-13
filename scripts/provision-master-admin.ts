import { randomUUID } from 'node:crypto'
import { initializeDatabase, insert, selectOne, update } from '../lib/db'
import { hashPassword, validatePasswordPolicy } from '../lib/security/password'

async function main() {
  const username = (process.env.MASTER_ADMIN_USERNAME ?? '').trim()
  const email = (process.env.MASTER_ADMIN_EMAIL ?? '').trim().toLowerCase()
  const password = process.env.MASTER_ADMIN_PASSWORD ?? ''

  if (
    !/^[a-zA-Z0-9._-]{3,64}$/.test(username) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password
  ) {
    throw new Error('Provide a valid master username, email, and password through MASTER_ADMIN_* environment variables.')
  }

  const passwordPolicy = validatePasswordPolicy(password)
  if (!passwordPolicy.valid) throw new Error(passwordPolicy.error)

  await initializeDatabase()

  const existing = await selectOne<{
    user_id: string
    is_protected: boolean | number
  }>('admin_users', 'lower(email) = ?', [email])
  if (!existing.success) throw new Error('Could not inspect the administrator database.')

  const existingMasterName = await selectOne<{ user_id: string }>(
    'admin_users',
    'lower(username) = ?',
    [username.toLowerCase()],
  )
  if (
    !existingMasterName.success ||
    (existingMasterName.data?.length && existingMasterName.data[0].user_id !== existing.data?.[0]?.user_id)
  ) {
    throw new Error('That master username is already assigned to another administrator.')
  }

  if (existing.data?.[0]?.is_protected === true || existing.data?.[0]?.is_protected === 1) {
    throw new Error('The protected master account already exists and cannot be changed.')
  }

  const userId = existing.data?.[0]?.user_id ?? randomUUID()
  const passwordHash = await hashPassword(password)
  const record = {
    username,
    email,
    password_hash: passwordHash,
    role: 'super_admin',
    permission_keys: JSON.stringify([]),
    active: true,
    is_protected: true,
    updated_at: new Date().toISOString(),
  }

  const result = existing.data?.length
    ? await update('admin_users', record, 'user_id = ?', [userId])
    : await insert('admin_users', { user_id: userId, ...record })

  if (!result.success) throw new Error('Could not provision the protected master account.')

  console.log('Protected master administrator provisioned successfully.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Master administrator provisioning failed.')
  process.exitCode = 1
})
