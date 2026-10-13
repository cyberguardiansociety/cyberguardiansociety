/**
 * Sets (or resets) an administrator password with Argon2id hashing.
 *
 * Usage:
 *   npx tsx scripts/set-admin-password.ts <email> <new-password>
 *   CGS_ADMIN_EMAIL=… CGS_ADMIN_PASSWORD=… npx tsx scripts/set-admin-password.ts
 *
 * The password must satisfy the platform policy (>= 12 characters, at least
 * three of: lowercase, uppercase, digits, symbols).
 */
import dotenv from 'dotenv'
import { initializeDatabase, selectOne, update } from '../lib/db'
import { hashPassword, validatePasswordPolicy } from '../lib/security/password'

// Load the project environment files explicitly (tsx does not inject them),
// so CGS_ADMIN_* / ADMIN_* values from .env.local are honoured.
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

async function main() {
  const email = (process.argv[2] ?? process.env.CGS_ADMIN_EMAIL ?? '').trim().toLowerCase()
  const password = process.argv[3] ?? process.env.CGS_ADMIN_PASSWORD ?? ''

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/set-admin-password.ts <email> <new-password>')
    process.exitCode = 1
    return
  }

  const policy = validatePasswordPolicy(password)
  if (!policy.valid) {
    console.error(`Password rejected: ${policy.error}`)
    process.exitCode = 1
    return
  }

  await initializeDatabase()

  const existing = await selectOne<{
    user_id: string
    email: string
    is_protected: boolean | number
  }>(
    'admin_users',
    'lower(email) = ?',
    [email],
  )
  if (!existing.success || !existing.data?.length) {
    console.error(`No administrator found with email "${email}".`)
    process.exitCode = 1
    return
  }
  if (existing.data[0].is_protected === true || existing.data[0].is_protected === 1) {
    console.error('This administrator account is protected; its credentials cannot be changed.')
    process.exitCode = 1
    return
  }

  const passwordHash = await hashPassword(password)
  const result = await update(
    'admin_users',
    { password_hash: passwordHash, updated_at: new Date().toISOString() },
    'email = ?',
    [email],
  )

  if (!result.success) {
    console.error('Failed to update the password:', result.error)
    process.exitCode = 1
    return
  }

  console.log(`Password updated for ${email}.`)
  console.log('Sign in again — any existing admin session cookie remains valid until it expires.')
}

main().catch((err) => {
  console.error('Password update failed:', err)
  process.exitCode = 1
})
