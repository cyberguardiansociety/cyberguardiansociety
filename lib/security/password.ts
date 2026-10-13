import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { argon2id, argon2Verify } from 'hash-wasm'

const COMMON_WEAK_PASSWORDS = new Set([
  'password1234',
  'admin1234567',
  'cyberguardian',
  'cyberguardiansociety',
  'changeme1234',
  'administrator',
  'welcome12345',
  'qwerty123456',
  'password123456',
  '123456789012',
  'letmein12345',
  'master123456',
])

export interface PasswordValidationResult {
  valid: boolean
  error?: string
}

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (typeof password !== 'string' || password.length < 12) {
    return {
      valid: false,
      error: 'Password must be at least 12 characters long.',
    }
  }

  if (password.length > 256) {
    return {
      valid: false,
      error: 'Password cannot exceed 256 characters.',
    }
  }

  const lower = password.toLowerCase()
  if (COMMON_WEAK_PASSWORDS.has(lower)) {
    return {
      valid: false,
      error: 'This password is too common or easily guessable. Please choose a stronger passphrase.',
    }
  }

  // Ensure character diversity (at least 3 of 4 classes: lowercase, uppercase, digits, symbols)
  let classes = 0
  if (/[a-z]/.test(password)) classes++
  if (/[A-Z]/.test(password)) classes++
  if (/[0-9]/.test(password)) classes++
  if (/[^a-zA-Z0-9]/.test(password)) classes++

  if (classes < 3) {
    return {
      valid: false,
      error: 'Password must contain at least 3 of the following: lowercase, uppercase, numbers, or special symbols.',
    }
  }

  return { valid: true }
}

/**
 * Hash password using Argon2id (RFC 9106 compliant).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16)
  const hash = await argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 65536, // 64 MB
    hashLength: 32,
    outputType: 'encoded',
  })
  return hash
}

/**
 * Verifies a password against an Argon2id encoded string.
 * Also accepts legacy bcrypt hashes (e.g. accounts that predate the
 * SQLite migration) and falls back to bcrypt comparison for them.
 */
export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  try {
    if (/^\$2[aby]\$/.test(encodedHash)) {
      return await bcrypt.compare(password, encodedHash)
    }
    const verified = await argon2Verify({
      password,
      hash: encodedHash,
    })
    return Boolean(verified)
  } catch {
    return false
  }
}

/**
 * Alias kept for call sites that used the `comparePassword` name.
 */
export async function comparePassword(password: string, encodedHash: string): Promise<boolean> {
  return verifyPassword(password, encodedHash)
}
