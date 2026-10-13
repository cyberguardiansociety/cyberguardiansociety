import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { logSecurityEvent } from '@/lib/security/logger'
import { isSupabaseRuntimeConfigured } from '@/lib/supabase/config'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

const DATA_DIR = path.join(process.cwd(), 'data')
const STATE_FILE = path.join(DATA_DIR, 'security-lockouts.json')

interface AccountLockoutState {
  failedAttempts: number
  lockoutCount: number
  lockedUntil: string | null
  lastAttemptAt: string
}

const lockoutsMap = new Map<string, AccountLockoutState>()

// Load state from disk if exists
function loadState(): void {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8')
      const parsed = JSON.parse(raw)
      for (const [key, val] of Object.entries(parsed)) {
        lockoutsMap.set(key, val as AccountLockoutState)
      }
    }
  } catch (err) {
    console.warn('[lockout] Failed to load security lockout state:', err)
  }
}

function persistState(): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    const obj = Object.fromEntries(lockoutsMap.entries())
    fs.writeFileSync(STATE_FILE, JSON.stringify(obj, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.warn('[lockout] Failed to save security lockout state:', err)
    return false
  }
}

if (process.env.VERCEL !== '1') loadState()

// Lockout duration escalations: 15 mins, 1 hour, 4 hours
const LOCKOUT_DURATIONS_MS = [
  15 * 60 * 1000,      // 15 mins
  60 * 60 * 1000,      // 1 hour
  4 * 60 * 60 * 1000,  // 4 hours
]

const MAX_FAILED_ATTEMPTS = 5

export async function isAccountLocked(identifier: string): Promise<{ locked: boolean; remainingSeconds?: number }> {
  const cleanId = identifier.trim().toLowerCase()
  if (isSupabaseRuntimeConfigured()) {
    const { data, error } = await createSupabaseServiceClient().from('admin_login_lockouts')
      .select('locked_until').eq('identifier', cleanId).maybeSingle()
    if (error) throw new Error('Administrator lockout status could not be checked.')
    const lockedUntil = data?.locked_until
    const lockedUntilMs = typeof lockedUntil === 'string' ? new Date(lockedUntil).getTime() : 0
    if (lockedUntilMs > Date.now()) {
      return { locked: true, remainingSeconds: Math.ceil((lockedUntilMs - Date.now()) / 1000) }
    }
    return { locked: false }
  }

  const record = lockoutsMap.get(cleanId)

  if (!record || !record.lockedUntil) {
    return { locked: false }
  }

  const lockedUntilMs = new Date(record.lockedUntil).getTime()
  const nowMs = Date.now()

  if (nowMs < lockedUntilMs) {
    const remainingSeconds = Math.ceil((lockedUntilMs - nowMs) / 1000)
    return { locked: true, remainingSeconds }
  }

  // Lockout expired
  record.lockedUntil = null
  persistState()
  return { locked: false }
}

export async function recordFailedLogin(
  identifier: string,
  meta?: { ip?: string; userAgent?: string; path?: string },
): Promise<{ isNowLocked: boolean; remainingAttempts: number; lockedUntil?: string }> {
  const cleanId = identifier.trim().toLowerCase()
  if (isSupabaseRuntimeConfigured()) {
    const { data, error } = await createSupabaseServiceClient().rpc?.('record_admin_login_failure', {
      identifier_key: cleanId,
    }) ?? { data: null, error: { message: 'Remote login lockout function is unavailable.', details: '', hint: '', code: 'RPC_UNAVAILABLE' } }
    if (error || !data || typeof data !== 'object') throw new Error('Administrator login failure could not be recorded.')
    const result = data as { isNowLocked: boolean; remainingAttempts: number; lockedUntil?: string | null }
    if (result.isNowLocked) {
      logSecurityEvent('ACCOUNT_LOCKED', 'Admin account locked due to excessive failed login attempts', {
        user: cleanId, ip: meta?.ip, userAgent: meta?.userAgent, path: meta?.path, severity: 'warn',
        details: { lockedUntil: result.lockedUntil },
      })
    } else {
      logSecurityEvent('LOGIN_FAILED', 'Failed admin login attempt', {
        user: cleanId, ip: meta?.ip, userAgent: meta?.userAgent, path: meta?.path, severity: 'warn',
        details: { remainingAttempts: result.remainingAttempts },
      })
    }
    return { ...result, lockedUntil: result.lockedUntil ?? undefined }
  }

  const now = new Date()

  let record = lockoutsMap.get(cleanId)
  if (!record) {
    record = {
      failedAttempts: 0,
      lockoutCount: 0,
      lockedUntil: null,
      lastAttemptAt: now.toISOString(),
    }
    lockoutsMap.set(cleanId, record)
  }

  record.failedAttempts += 1
  record.lastAttemptAt = now.toISOString()

  let isNowLocked = false

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const durationTier = Math.min(record.lockoutCount, LOCKOUT_DURATIONS_MS.length - 1)
    const durationMs = LOCKOUT_DURATIONS_MS[durationTier]
    const lockedUntilDate = new Date(now.getTime() + durationMs)

    record.lockedUntil = lockedUntilDate.toISOString()
    record.lockoutCount += 1
    record.failedAttempts = 0
    isNowLocked = true

    logSecurityEvent('ACCOUNT_LOCKED', `Admin account locked due to excessive failed attempts`, {
      user: cleanId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      path: meta?.path,
      severity: 'warn',
      details: {
        lockoutTier: durationTier + 1,
        lockedUntil: record.lockedUntil,
        lockoutDurationSeconds: durationMs / 1000,
      },
    })
  } else {
    logSecurityEvent('LOGIN_FAILED', `Failed admin login attempt (${record.failedAttempts}/${MAX_FAILED_ATTEMPTS})`, {
      user: cleanId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      path: meta?.path,
      severity: 'warn',
      details: {
        attemptNumber: record.failedAttempts,
      },
    })
  }

  persistState()

  return {
    isNowLocked,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - record.failedAttempts),
    lockedUntil: record.lockedUntil ?? undefined,
  }
}

export async function recordSuccessfulLogin(
  identifier: string,
  meta?: { ip?: string; userAgent?: string; path?: string },
): Promise<void> {
  const cleanId = identifier.trim().toLowerCase()
  if (isSupabaseRuntimeConfigured()) {
    const { error } = await createSupabaseServiceClient().from('admin_login_lockouts')
      .update({ failed_attempts: 0, locked_until: null, last_attempt_at: new Date().toISOString() })
      .eq('identifier', cleanId)
    if (error) throw new Error('Administrator lockout state could not be reset.')
    logSecurityEvent('LOGIN_SUCCESS', 'Admin account authenticated successfully', {
      user: cleanId, ip: meta?.ip, userAgent: meta?.userAgent, path: meta?.path, severity: 'info',
    })
    return
  }

  const record = lockoutsMap.get(cleanId)

  if (record) {
    record.failedAttempts = 0
    record.lockedUntil = null
    persistState()
  }

  logSecurityEvent('LOGIN_SUCCESS', `Admin account authenticated successfully`, {
    user: cleanId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    path: meta?.path,
    severity: 'info',
  })
}

export async function unlockAccount(identifier: string): Promise<boolean> {
  const cleanId = identifier.trim().toLowerCase()
  if (isSupabaseRuntimeConfigured()) {
    const { data, error } = await createSupabaseServiceClient().from('admin_login_lockouts')
      .update({ failed_attempts: 0, locked_until: null, lockout_count: 0, last_attempt_at: new Date().toISOString() })
      .eq('identifier', cleanId).select('identifier')
    if (error) throw new Error('Administrator lockout could not be cleared.')
    if (!Array.isArray(data) || data.length === 0) return false
    logSecurityEvent('ACCOUNT_UNLOCKED', 'Admin account manually unlocked via recovery', { user: cleanId, severity: 'warn' })
    return true
  }

  const record = lockoutsMap.get(cleanId)

  if (record) {
    record.failedAttempts = 0
    record.lockedUntil = null
    record.lockoutCount = 0
    persistState()

    logSecurityEvent('ACCOUNT_UNLOCKED', `Admin account manually unlocked via recovery`, {
      user: cleanId,
      severity: 'warn',
    })
    return true
  }

  return false
}

export async function clearAllAccountLockouts(): Promise<number> {
  if (isSupabaseRuntimeConfigured()) {
    const { data, error } = await createSupabaseServiceClient().from('admin_login_lockouts')
      .delete().select('identifier')
    if (error) throw new Error('Unable to persist the cleared login lockouts.')
    const clearedCount = Array.isArray(data) ? data.length : 0
    logSecurityEvent('ACCOUNT_LOCKOUTS_CLEARED', 'All administrator login lockout state cleared from settings', {
      severity: 'warn', details: { recordsCleared: clearedCount },
    })
    return clearedCount
  }

  const previous = Array.from(lockoutsMap.entries())
  const clearedCount = previous.length
  lockoutsMap.clear()
  if (!persistState()) {
    for (const [identifier, state] of previous) lockoutsMap.set(identifier, state)
    throw new Error('Unable to persist the cleared login lockouts.')
  }
  logSecurityEvent('ACCOUNT_LOCKOUTS_CLEARED', 'All administrator login lockout state cleared from settings', {
    severity: 'warn',
    details: { recordsCleared: clearedCount },
  })
  return clearedCount
}

/**
 * Constant-time dummy computation to mitigate username enumeration via timing attacks.
 */
export async function performDummyTimingWork(): Promise<void> {
  const dummyBuffer = crypto.randomBytes(32)
  crypto.pbkdf2Sync('dummy_password_timing_mitigation', dummyBuffer, 10000, 32, 'sha256')
}
