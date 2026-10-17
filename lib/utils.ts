type ClassValue = ClassArray | ClassDictionary | string | number | null | boolean | undefined
type ClassDictionary = Record<string, any>
type ClassArray = ClassValue[]

function toVal(mix: ClassValue): string {
  let str = ''
  if (typeof mix === 'string' || typeof mix === 'number') {
    str += mix
  } else if (typeof mix === 'object' && mix !== null) {
    if (Array.isArray(mix)) {
      for (let k = 0; k < mix.length; k++) {
        if (mix[k]) {
          const y = toVal(mix[k])
          if (y) {
            if (str) str += ' '
            str += y
          }
        }
      }
    } else {
      for (const k in mix) {
        if ((mix as Record<string, any>)[k]) {
          if (str) str += ' '
          str += k
        }
      }
    }
  }
  return str
}

/**
 * Native, zero-dependency className concatenation utility.
 * Replaces external untrusted packages to protect against supply-chain vulnerabilities.
 */
export function cn(...inputs: ClassValue[]): string {
  let i = 0
  let tmp: ClassValue
  let out = ''
  while (i < inputs.length) {
    tmp = inputs[i++]
    if (tmp) {
      const x = toVal(tmp)
      if (x) {
        if (out) out += ' '
        out += x
      }
    }
  }
  return out
}

/**
 * Validates and sanitizes URLs for safe rendering in href and src attributes.
 * Rejects javascript:, data:, and unsafe protocol schemes.
 */
export function safeContentUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return null
  const trimmed = url.trim()
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\0')) {
    return trimmed
  }
  try {
    const parsed = new URL(trimmed)
    if (['https:', 'http:', 'mailto:'].includes(parsed.protocol)) {
      return parsed.href
    }
    return null
  } catch {
    return null
  }
}
