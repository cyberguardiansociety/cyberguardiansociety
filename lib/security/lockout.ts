import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { logSecurityEvent } from '@/lib/security/logger'

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

loadState()

// Lockout duration escalations: 15 mins, 1 hour, 4 hours
const LOCKOUT_DURATIONS_MS = [
  15 * 60 * 1000,      // 15 mins
  60 * 60 * 1000,      // 1 hour
  4 * 60 * 60 * 1000,  // 4 hours
]

const MAX_FAILED_ATTEMPTS = 5

export function isAccountLocked(identifier: string): { locked: boolean; remainingSeconds?: number } {
  const cleanId = identifier.trim().toLowerCase()
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

export function recordFailedLogin(
  identifier: string,
  meta?: { ip?: string; userAgent?: string; path?: string },
): { isNowLocked: boolean; remainingAttempts: number; lockedUntil?: string } {
  const cleanId = identifier.trim().toLowerCase()
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

export function recordSuccessfulLogin(
  identifier: string,
  meta?: { ip?: string; userAgent?: string; path?: string },
): void {
  const cleanId = identifier.trim().toLowerCase()
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

export function unlockAccount(identifier: string): boolean {
  const cleanId = identifier.trim().toLowerCase()
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

export function clearAllAccountLockouts(): number {
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
