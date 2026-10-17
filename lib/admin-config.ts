import { redirect } from 'next/navigation'

/**
 * Common guessable paths that must never be used as ADMIN_BASE_PATH
 */
const FORBIDDEN_PATHS = new Set([
  '/admin',
  '/admin/login',
  '/login',
  '/administrator',
  '/wp-admin',
  '/wp-login',
  '/dashboard',
  '/cpanel',
  '/auth',
  '/signin',
  '/backend',
  '/manage',
  '/control',
])

function validateAndGetAdminBasePath(): string {
  const rawPath = process.env.ADMIN_BASE_PATH?.trim()

  if (!rawPath) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SECURITY VIOLATION: ADMIN_BASE_PATH is missing. It must be set to a secret slug of at least 20 characters in production.',
      )
    }
    // Development fallback if not set
    return '/cgs-ops-7f3k9x2m8q4v1w5n'
  }

  const normalized = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  const stripped = normalized.replace(/\/+$/, '')

  if (FORBIDDEN_PATHS.has(stripped.toLowerCase())) {
    throw new Error(
      `SECURITY VIOLATION: ADMIN_BASE_PATH cannot be set to a well-known path ("${stripped}"). Use a high-entropy secret path.`,
    )
  }

  if (stripped.length < 20 && process.env.NODE_ENV === 'production') {
    throw new Error(
      `SECURITY VIOLATION: ADMIN_BASE_PATH must be at least 20 characters long for cryptographic obscurity (current length: ${stripped.length}).`,
    )
  }

  return stripped
}

export const ADMIN_BASE_PATH = validateAndGetAdminBasePath()

export const ADMIN_IP_ALLOWLIST: string[] = (process.env.ADMIN_IP_ALLOWLIST ?? '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean)

import crypto from 'crypto'

const isExplicitLocalDev =
  process.env.ALLOW_INSECURE_DEV_SECRETS === '1' ||
  (process.env.NODE_ENV === 'development' && !process.env.VERCEL && !process.env.NETLIFY && !process.env.CI)

const configuredSessionSecret = process.env.SESSION_SECRET?.trim()
const configuredTotpEncryptionKey = process.env.TOTP_ENCRYPTION_KEY?.trim()

if (!isExplicitLocalDev) {
  if (!configuredSessionSecret || configuredSessionSecret.length < 32) {
    throw new Error(
      'FATAL SECURITY ERROR: SESSION_SECRET must be configured with at least 32 characters in all staging, preview, and production environments.',
    )
  }
}

export const SESSION_SECRET =
  configuredSessionSecret || 'cgs_local_dev_only_session_secret_32_bytes_min_entropy_key!'

export const TOTP_ENCRYPTION_KEY =
  configuredTotpEncryptionKey ||
  crypto.createHmac('sha256', SESSION_SECRET).update('cgs-totp-encryption-fallback-key').digest('hex')

/**
 * Derives cryptographically separate keys from SESSION_SECRET to prevent cross-context token reuse.
 */
export function getDerivedSessionSecret(): Buffer {
  return crypto.createHmac('sha256', SESSION_SECRET).update('cgs-session-token-v1-context').digest()
}

export function getDerivedFileSigningSecret(): Buffer {
  return crypto.createHmac('sha256', SESSION_SECRET).update('cgs-private-file-url-v1-context').digest()
}

/**
 * Universal helper for constructing URLs under the secret ADMIN_BASE_PATH.
 * Prevents hardcoding of the admin path across the codebase.
 */
export function adminUrl(
  subPath = '',
  query?: Record<string, string | number | boolean | null | undefined>,
): string {
  const cleanSubPath = subPath.startsWith('/') ? subPath : subPath ? `/${subPath}` : ''
  const base = `${ADMIN_BASE_PATH}${cleanSubPath}`

  if (!query) return base

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  }

  const queryString = searchParams.toString()
  return queryString ? `${base}?${queryString}` : base
}

/**
 * Server-side redirect helper to administrative routes.
 */
export function adminRedirect(
  subPath = '',
  query?: Record<string, string | number | boolean | null | undefined>,
): never {
  redirect(adminUrl(subPath, query))
}
