import crypto from 'crypto'
import { SESSION_SECRET } from '@/lib/admin-config'

export interface AdminSessionPayload {
  userId: string
  email: string
  role: string
  createdAt: number
  expiresAt: number
  lastActiveAt: number
}

function getSigningKey(): Buffer {
  return crypto.createHash('sha256').update(SESSION_SECRET).digest()
}

export function signAdminSessionPayload(payload: AdminSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const hmac = crypto.createHmac('sha256', getSigningKey()).update(data).digest('base64url')
  return `${data}.${hmac}`
}

export function verifyAdminSessionToken(signed: string): AdminSessionPayload | null {
  try {
    const [data, hmac] = signed.split('.')
    if (!data || !hmac) return null

    const expectedHmac = crypto.createHmac('sha256', getSigningKey()).update(data).digest('base64url')
    if (
      hmac.length !== expectedHmac.length ||
      !crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))
    ) {
      return null
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8')) as AdminSessionPayload
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string' ||
      !Number.isFinite(payload.createdAt) ||
      !Number.isFinite(payload.expiresAt) ||
      !Number.isFinite(payload.lastActiveAt)
    ) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

/** Validates the session and rolls its idle timeout from a request context. */
export function refreshAdminSessionToken(token: string, now = Date.now()): {
  token: string
  expiresAt: number
  refreshed: boolean
} | null {
  const payload = verifyAdminSessionToken(token)
  if (!payload || now > payload.expiresAt || now - payload.lastActiveAt > 30 * 60 * 1000) return null

  if (now - payload.lastActiveAt <= 2 * 60 * 1000) {
    return { token, expiresAt: payload.expiresAt, refreshed: false }
  }

  payload.lastActiveAt = now
  return {
    token: signAdminSessionPayload(payload),
    expiresAt: payload.expiresAt,
    refreshed: true,
  }
}
