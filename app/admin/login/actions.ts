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
import { createSupabaseServiceClient } from '@/lib/supabase/service'

/**
 * Step 1: Primary Authentication (Email + Password) with Lockout and Rate Limiting
 */
export async function signIn(formData: FormData) {
  const clientIp = await extractClientIp()

  // 1. IP Rate Limiting (5 attempts / 15 minutes)
  const rateLimit = await checkRateLimit(clientIp, 'admin-login-post', 5, 15 * 60 * 1000)
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
  const lockStatus = await isAccountLocked(identifier)
  if (lockStatus.locked) {
    await performDummyTimingWork()
    redirect(adminUrl('/login', { error: 'locked' }))
  }

  // 3. Look up admin user in database
  const database = createSupabaseServiceClient()
  let { data: adminUser, error: lookupError } = await database.from('admin_users').select(
    'user_id, email, password_hash, role, active',
  ).eq('email', identifier).maybeSingle()
  if (!adminUser && !lookupError) {
    const lookup = await database.from('admin_users').select(
      'user_id, email, password_hash, role, active',
    ).ilike('username', identifier).maybeSingle()
    adminUser = lookup.data
    lookupError = lookup.error
  }

  if (lookupError || !adminUser) {
    await recordFailedLogin(identifier, { ip: clientIp, path: '/login' })
    await performDummyTimingWork()
    redirect(adminUrl('/login', { error: 'credentials' }))
  }

  const result = adminUser as unknown as {
    user_id: string
    email: string
    password_hash: string
    role: string
    active: number | boolean
  }

  const accountLockStatus = await isAccountLocked(result.email)
  if (accountLockStatus.locked) {
    await performDummyTimingWork()
    redirect(adminUrl('/login', { error: 'locked' }))
  }

  // 4. Verify password
  const passwordMatch = await comparePassword(passwordValue, result.password_hash)
  if (!passwordMatch) {
    await recordFailedLogin(result.email, { ip: clientIp, path: '/login' })
    await performDummyTimingWork()
    redirect(adminUrl('/login', { error: 'credentials' }))
  }

  // 5. Check if user is active
  if (result.active !== true && result.active !== 1) {
    await recordFailedLogin(result.email, { ip: clientIp, path: '/login' })
    await performDummyTimingWork()
    redirect(adminUrl('/login', { error: 'unauthorized' }))
  }

  // Password succeeded -> Reset lockout counter
  await recordSuccessfulLogin(result.email, { ip: clientIp, path: '/login' })

  // 6. Create admin session
  await createFullAdminSession(result.user_id, result.email, result.role)
  redirect(adminUrl())
}

/**
 * Full Admin Sign Out
 */
export async function signOut() {
  await destroyAdminSession()
  redirect('/')
}
