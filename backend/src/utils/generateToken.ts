import crypto from 'crypto'

/**
 * Generates a cryptographically secure random hexadecimal token.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * Generates an application submission reference ID formatted as CGS-YYYYMMDD-HEX.
 */
export function generateReferenceCode(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `CGS-${stamp}-${randomHex}`
}
