import 'server-only'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { getDerivedSessionSecret, ADMIN_BASE_PATH } from '@/lib/admin-config'
import { signAdminSessionPayload, verifyAdminSessionToken, type AdminSessionPayload } from '@/lib/security/session-token'

const ADMIN_SESSION_COOKIE = '__cgs_admin_session'
const CSRF_COOKIE = '__cgs_csrf'

function getSigningKey(): Buffer {
  return getDerivedSessionSecret()
}

/**
 * Initializes a signed admin session (30-min idle rolling, 8-hour absolute timeout).
 */
export async function createFullAdminSession(userId: string, email: string, role: string): Promise<void> {
  const cookieStore = await cookies()

  const now = Date.now()
  const payload: AdminSessionPayload = {
    userId,
    email,
    role,
    createdAt: now,
    expiresAt: now + 8 * 60 * 60 * 1000, // 8 hours absolute limit
    lastActiveAt: now,
  }

  const token = signAdminSessionPayload(payload)
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60,
  })

  // Also issue fresh CSRF token
  await issueCsrfToken()
}

/**
 * Validates the full admin session with rolling idle timeout and absolute expiry.
 */
export async function getVerifiedAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  if (!token) return null

  const payload = verifyAdminSessionToken(token)
  if (!payload) return null

  const now = Date.now()

  // 1. Check absolute timeout (8 hours)
  if (now > payload.expiresAt) {
    return null
  }

  // 2. Check rolling idle timeout (30 minutes)
  const idleMaxMs = 30 * 60 * 1000
  if (now - payload.lastActiveAt > idleMaxMs) {
    return null
  }

  // Cookie changes are not allowed during Server Component rendering. The
  // proxy refreshes the signed cookie in its response context instead.
  return payload
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  cookieStore.set(CSRF_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
}

/**
 * CSRF Protection
 */
export async function issueCsrfToken(): Promise<string> {
  const cookieStore = await cookies()
  const secret = crypto.randomBytes(24).toString('hex')
  const timestamp = Date.now()
  const tokenPayload = `${secret}:${timestamp}`
  const hmac = crypto.createHmac('sha256', getSigningKey()).update(tokenPayload).digest('hex')
  const fullToken = `${tokenPayload}:${hmac}`

  cookieStore.set(CSRF_COOKIE, fullToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60,
  })

  return fullToken
}

export async function verifyCsrfToken(submittedToken: unknown): Promise<boolean> {
  if (typeof submittedToken !== 'string' || !submittedToken) return false

  const cookieStore = await cookies()
  const storedToken = cookieStore.get(CSRF_COOKIE)?.value
  if (!storedToken) return false

  // Constant-time compare
  try {
    const bufA = Buffer.from(submittedToken, 'utf-8')
    const bufB = Buffer.from(storedToken, 'utf-8')
    if (bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}
