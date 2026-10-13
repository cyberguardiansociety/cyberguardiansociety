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

const configuredSessionSecret = process.env.SESSION_SECRET?.trim()
const configuredTotpEncryptionKey = process.env.TOTP_ENCRYPTION_KEY?.trim()

if (process.env.NODE_ENV === 'production') {
  if (!configuredSessionSecret || configuredSessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters in production.')
  }
}

export const SESSION_SECRET =
  configuredSessionSecret || 'cgs_default_session_secret_change_in_production_min_32_bytes!'

// TOTP is no longer part of the admin sign-in path. Keep the legacy helper
// key available only for its explicit maintenance/test module, so normal admin
// login startup does not depend on an MFA-only secret.
export const TOTP_ENCRYPTION_KEY =
  configuredTotpEncryptionKey || 'cgs_default_totp_encryption_key_32_bytes_len_min!'

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
