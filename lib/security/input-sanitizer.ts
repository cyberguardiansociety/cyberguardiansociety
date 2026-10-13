import 'server-only'

/**
 * Production-grade input sanitization and privacy masking utilities.
 * Designed to prevent XSS, control-character injection, CSV formula injection,
 * and PII leakage in server logs.
 */

/**
 * Strips null bytes, dangerous unprintable ASCII control characters,
 * and Unicode bidirectional override characters that can obfuscate text.
 * Preserves normal whitespace (newlines, tabs, spaces) and standard Unicode text.
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return ''
  
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove Unicode bidirectional override characters (U+202A to U+202E, U+2066 to U+2069)
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    // Remove unprintable ASCII control characters (0x01-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F)
    // Preserves \t (0x09), \n (0x0A), \r (0x0D)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

/**
 * Normalizes email addresses consistently:
 * - Trims whitespace
 * - Converts to lower case
 * - Strips any internal nulls/control characters
 */
export function normalizeEmail(email: unknown): string {
  if (typeof email !== 'string') return ''
  return sanitizeText(email).toLowerCase()
}

/**
 * Validates whether a given URL is a safe web URL (http: or https:).
 * Rejects javascript:, data:, file:, vbscript:, and URLs with embedded credentials.
 */
export function isSafeWebUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false

  try {
    const parsed = new URL(trimmed)
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password &&
      parsed.hostname.includes('.') &&
      !parsed.hostname.startsWith('.') &&
      !parsed.hostname.endsWith('.')
    )
  } catch {
    return false
  }
}

/**
 * Escapes strings for safe inclusion in CSV / spreadsheets.
 * Neutralizes CSV Formula Injection (DDE attacks) where leading '=', '+', '-', '@',
 * '\t', or '\r' can trigger code execution when opened in Excel/Sheets.
 */
export function sanitizeForCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value).trim()
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`
  }
  return str
}

/**
 * Masks an email address for privacy-conscious logs.
 * e.g., "shanyan.ahmed@example.com" -> "s***d@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '[REDACTED_EMAIL]'
  const [local, domain] = email.split('@', 2)
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`
}

/**
 * Masks an IP address for privacy-conscious logs.
 * IPv4: "192.168.1.100" -> "192.168.***.***"
 * IPv6: "2001:db8:85a3:8d3:1319:8a2e:370:7348" -> "2001:db8:****"
 */
export function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown'
  const trimmed = ip.trim()
  
  // IPv4
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`
    }
  }
  
  // IPv6
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':')
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:****`
    }
  }
  
  return '[MASKED_IP]'
}
