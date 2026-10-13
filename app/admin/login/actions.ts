'use server'

import { redirect } from 'next/navigation'
import { adminUrl } from '@/lib/admin-config'
import { checkRateLimit, extractClientIp } from '@/lib/security/rate-limiter'
import {
  isAccountLocked,
  recordFailedLogin,
  recordSuccessfulLogin,
  performDummyTimingWork,
} from '@/lib/security/lockout'
import {
  createFullAdminSession,
  destroyAdminSession,
} from '@/lib/security/session'
import { logSecurityEvent } from '@/lib/security/logger'
import { comparePassword } from '@/lib/security/password'
import { selectOne } from '@/lib/db'
import { initializeDatabase } from '@/lib/db'

/**
 * Step 1: Primary Authentication (Email + Password) with Lockout and Rate Limiting
 */
export async function signIn(formData: FormData) {
  const clientIp = await extractClientIp()

  // Initialize database if needed
  await initializeDatabase()

  // 1. IP Rate Limiting (5 attempts / 15 minutes)
  const rateLimit = checkRateLimit(clientIp, 'admin-login-post', 5, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    redirect(adminUrl('/login', { error: 'rate-limit' }))
  }

  const emailValue = formData.get('email')
  const passwordValue = formData.get('password')

  if (typeof emailValue !== 'string' || typeof passwordValue !== 'string') {
    redirect(adminUrl('/login', { error: 'credentials' }))
  }

  const identifier = emailValue.trim().toLowerCase()
  if (
    identifier.length < 3 ||
    identifier.length > 320 ||
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) && !/^[a-z0-9._-]{3,64}$/.test(identifier)) ||
    passwordValue.length < 1 ||
    passwordValue.length > 1024
  ) {
    await performDummyTimingWork()
    redirect(adminUrl('/login', { error: 'credentials' }))
  }

  // 2. Account Lockout Check
  const lockStatus = isAccountLocked(identifier)
  if (lockStatus.locked) {
    await performDummyTimingWork()
    redirect(adminUrl('/login', { error: 'locked' }))
  }

  // 3. Look up admin user in database
  const result = await selectOne<{
    user_id: string
    email: string
    password_hash: string
    role: string
    active: number
  }>(
    'admin_users',
    '(lower(email) = ? OR lower(username) = ?)',
    [identifier, identifier]
  )

  if (!result.success || !result.data || result.data.length === 0) {
    recordFailedLogin(identifier, { ip: clientIp, path: '/login' })
    await performDummyTimingWork()
    redirect(adminUrl('/login', { error: 'credentials' }))
  }

  const adminUser = result.data[0]
  const accountLockStatus = isAccountLocked(adminUser.email)
  if (accountLockStatus.locked) {
    await performDummyTimingWork()
    redirect(adminUrl('/login', { error: 'locked' }))
  }

  // 4. Verify password
  const passwordMatch = await comparePassword(passwordValue, adminUser.password_hash)
  if (!passwordMatch) {
    recordFailedLogin(adminUser.email, { ip: clientIp, path: '/login' })
    await performDummyTimingWork()
    redirect(adminUrl('/login', { error: 'credentials' }))
  }

  // 5. Check if user is active
  if (!adminUser.active) {
    recordFailedLogin(adminUser.email, { ip: clientIp, path: '/login' })
    await performDummyTimingWork()
    redirect(adminUrl('/login', { error: 'unauthorized' }))
  }

  // Password succeeded -> Reset lockout counter
  recordSuccessfulLogin(adminUser.email, { ip: clientIp, path: '/login' })

  // 6. Create admin session
  await createFullAdminSession(adminUser.user_id, adminUser.email, adminUser.role)
  redirect(adminUrl())
}

/**
 * Full Admin Sign Out
 */
export async function signOut() {
  await destroyAdminSession()
  redirect('/')
}
