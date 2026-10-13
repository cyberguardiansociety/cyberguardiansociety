import dotenv from 'dotenv'
import { initializeDatabase, insert, selectOne } from '../lib/db'
import { hashPassword, validatePasswordPolicy } from '../lib/security/password'
import { randomUUID } from 'crypto'

// Load the project environment files explicitly (tsx does not inject them),
// so ADMIN_EMAIL / ADMIN_PASSWORD from .env.local are honoured.
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

async function seedAdmin() {
  console.log('Initializing database...')
  await initializeDatabase()

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || ''

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD explicitly before seeding an administrator.')
    process.exitCode = 1
    return
  }

  // Idempotency: never create a second account for an existing address.
  const existing = await selectOne<{ user_id: string }>('admin_users', 'email = ?', [email])
  if (existing.success && existing.data?.length) {
    console.log(`An administrator with the email "${email}" already exists — nothing to do.`)
    console.log('Existing account was left unchanged.')
    return
  }

  const policy = validatePasswordPolicy(password)
  if (!policy.valid) {
    console.error(`Password rejected: ${policy.error}`)
    console.error('Set a stronger ADMIN_PASSWORD (or pass it to npm run admin:password) and retry.')
    process.exitCode = 1
    return
  }

  console.log('Creating admin user...')
  const hashedPassword = await hashPassword(password)

  const result = await insert('admin_users', {
    user_id: randomUUID(),
    email,
    password_hash: hashedPassword,
    role: 'super_admin',
    permission_keys: JSON.stringify([]),
    active: 1,
  })

  if (result.success) {
    console.log('✅ Admin user created successfully!')
    console.log(`Email: ${email}`)
    console.log('Password: (the value you configured — not printed here)')
    console.log('⚠️  Change the password after first login: npm run admin:password <email> "<new-password>"')
  } else {
    console.error('❌ Failed to create admin user:', result.error)
    process.exitCode = 1
  }
}

seedAdmin().catch((err) => {
  console.error('Seeding failed:', err)
  process.exitCode = 1
})
