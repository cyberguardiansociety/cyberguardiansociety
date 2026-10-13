import crypto from 'crypto'
import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { TOTP_ENCRYPTION_KEY } from '@/lib/admin-config'
import { logSecurityEvent } from '@/lib/security/logger'

const DATA_DIR = path.join(process.cwd(), 'data')
const TOTP_STORE_FILE = path.join(DATA_DIR, 'admin-2fa-store.json')

// Anti-replay cache: stores key `${userId}:${token}` until expiration
const usedTokensCache = new Map<string, number>()

export interface Admin2FARecord {
  userId: string
  email: string
  encryptedSecret: string // AES-256-GCM format: iv:tag:ciphertext (hex)
  recoveryCodeHashes: string[]
  enrolledAt: string
  lastUsedAt?: string
}

const totpRecords = new Map<string, Admin2FARecord>()

function loadTotpStore(): void {
  try {
    if (fs.existsSync(TOTP_STORE_FILE)) {
      const raw = fs.readFileSync(TOTP_STORE_FILE, 'utf-8')
      const parsed = JSON.parse(raw)
      for (const [key, val] of Object.entries(parsed)) {
        totpRecords.set(key, val as Admin2FARecord)
      }
    }
  } catch (err) {
    console.warn('[totp] Failed to load 2FA store:', err)
  }
}

function persistTotpStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    const obj = Object.fromEntries(totpRecords.entries())
    fs.writeFileSync(TOTP_STORE_FILE, JSON.stringify(obj, null, 2), 'utf-8')
  } catch (err) {
    console.warn('[totp] Failed to save 2FA store:', err)
  }
}

loadTotpStore()

/**
 * Derives a 32-byte key for AES-256-GCM from the configured secret.
 */
function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(TOTP_ENCRYPTION_KEY).digest()
}

/**
 * Encrypts a plaintext TOTP secret with AES-256-GCM.
 */
export function encryptSecret(secret: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(secret, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')

  return `${iv.toString('hex')}:${tag}:${encrypted}`
}

/**
 * Decrypts an AES-256-GCM encrypted TOTP secret.
 */
export function decryptSecret(encryptedPayload: string): string {
  const [ivHex, tagHex, encryptedHex] = encryptedPayload.split(':')
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Malformed encrypted TOTP payload.')
  }

  const key = getEncryptionKey()
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * Generates 10 single-use recovery codes (formatted e.g. 'XXXX-XXXX').
 */
export function generateRecoveryCodes(count = 10): { codes: string[]; hashes: string[] } {
  const codes: string[] = []
  const hashes: string[] = []

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase()
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`
    const hash = crypto.createHash('sha256').update(formatted).digest('hex')
    codes.push(formatted)
    hashes.push(hash)
  }

  return { codes, hashes }
}

export function is2FAEnrolled(userId: string): boolean {
  return totpRecords.has(userId)
}

/**
 * Generates a new TOTP secret and QR code for an enrollment session.
 */
export async function generateEnrollment(
  userId: string,
  userEmail: string,
): Promise<{
  secret: string
  qrCodeDataUrl: string
  otpauthUrl: string
  recoveryCodes: string[]
  recoveryCodeHashes: string[]
}> {
  const secret = generateSecret()
  const issuer = 'Cyber Guardian Society'
  const otpauthUrl = generateURI({ secret, issuer, label: userEmail })
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 2,
    width: 256,
    color: { dark: '#000000', light: '#FFFFFF' },
  })

  const { codes, hashes } = generateRecoveryCodes(10)

  return {
    secret,
    qrCodeDataUrl,
    otpauthUrl,
    recoveryCodes: codes,
    recoveryCodeHashes: hashes,
  }
}

/**
 * Confirms and activates 2FA for a user after verifying an initial code.
 */
export function confirmEnrollment(
  userId: string,
  userEmail: string,
  secret: string,
  code: string,
  recoveryCodeHashes: string[],
): boolean {
  const result = verifySync({ token: code.trim(), secret })
  if (!result?.valid) return false

  const encryptedSecret = encryptSecret(secret)
  totpRecords.set(userId, {
    userId,
    email: userEmail,
    encryptedSecret,
    recoveryCodeHashes,
    enrolledAt: new Date().toISOString(),
  })

  persistTotpStore()

  logSecurityEvent('2FA_ENROLLED', `Admin 2FA enrolled successfully`, {
    user: userEmail,
    severity: 'info',
  })

  return true
}

/**
 * Validates a TOTP or single-use recovery code.
 */
export function verify2FA(
  userId: string,
  userEmail: string,
  codeOrRecovery: string,
): { valid: boolean; usedRecoveryCode?: boolean } {
  const record = totpRecords.get(userId)
  if (!record) return { valid: false }

  const cleanInput = codeOrRecovery.trim().toUpperCase()

  // 1. Check if input matches a single-use recovery code
  const inputHash = crypto.createHash('sha256').update(cleanInput).digest('hex')
  const recoveryIndex = record.recoveryCodeHashes.indexOf(inputHash)

  if (recoveryIndex !== -1) {
    // Consume single-use recovery code
    record.recoveryCodeHashes.splice(recoveryIndex, 1)
    record.lastUsedAt = new Date().toISOString()
    persistTotpStore()

    logSecurityEvent('2FA_RECOVERY_USED', `Admin used a single-use backup recovery code`, {
      user: userEmail,
      severity: 'warn',
      details: { remainingRecoveryCodes: record.recoveryCodeHashes.length },
    })

    return { valid: true, usedRecoveryCode: true }
  }

  // 2. Check TOTP token
  const replayKey = `${userId}:${cleanInput}`
  const now = Date.now()

  // Anti-replay check
  if (usedTokensCache.has(replayKey)) {
    const expiredAt = usedTokensCache.get(replayKey)!
    if (now < expiredAt) {
      logSecurityEvent('2FA_FAILED', `Replayed TOTP code rejected for admin`, {
        user: userEmail,
        severity: 'warn',
      })
      return { valid: false }
    }
  }

  try {
    const secret = decryptSecret(record.encryptedSecret)
    const result = verifySync({ token: cleanInput, secret })

    if (result?.valid) {
      // Store token in anti-replay cache for 90 seconds (window = 1 step)
      usedTokensCache.set(replayKey, now + 90 * 1000)
      record.lastUsedAt = new Date().toISOString()
      persistTotpStore()

      logSecurityEvent('2FA_SUCCESS', `Admin 2FA verified successfully`, {
        user: userEmail,
        severity: 'info',
      })

      return { valid: true, usedRecoveryCode: false }
    }
  } catch (err) {
    console.error('[totp] Error decrypting or verifying TOTP:', err)
  }

  logSecurityEvent('2FA_FAILED', `Invalid 2FA code entered for admin`, {
    user: userEmail,
    severity: 'warn',
  })

  return { valid: false }
}

export function reset2FA(userIdOrEmail: string): boolean {
  const clean = userIdOrEmail.trim().toLowerCase()
  let targetId: string | null = null

  for (const [id, rec] of totpRecords.entries()) {
    if (id.toLowerCase() === clean || rec.email.toLowerCase() === clean) {
      targetId = id
      break
    }
  }

  if (targetId && totpRecords.has(targetId)) {
    const rec = totpRecords.get(targetId)!
    totpRecords.delete(targetId)
    persistTotpStore()

    logSecurityEvent('2FA_RESET', `Admin 2FA was manually reset`, {
      user: rec.email,
      severity: 'warn',
    })
    return true
  }

  return false
}
