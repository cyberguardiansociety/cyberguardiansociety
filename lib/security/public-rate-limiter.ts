import 'server-only'

/**
 * Production-Grade Rate Limiting & Duplicate Submission Protection
 * - Proxy-aware client IP extraction (Cloudflare, Vercel, standard proxies)
 * - Sliding-window rate limiting per endpoint
 * - Support for optional distributed Upstash/Redis store with automatic in-memory fallback
 * - Memory-bounded LRU eviction
 * - Idempotency & duplicate submission window
 */

export interface RateLimitPolicy {
  maxRequests: number
  windowSeconds: number
  bucketName: string
}

export const RATE_LIMIT_POLICIES = {
  CONTACT: {
    bucketName: 'public:contact',
    maxRequests: 5,
    windowSeconds: 10 * 60, // 5 requests per 10 minutes
  },
  JOIN_APPLICATION: {
    bucketName: 'public:join_application',
    maxRequests: 3,
    windowSeconds: 60 * 60, // 3 requests per 1 hour
  },
  JOIN_QUICK: {
    bucketName: 'public:join_quick',
    maxRequests: 5,
    windowSeconds: 60 * 60, // 5 requests per 1 hour
  },
  NEWSLETTER: {
    bucketName: 'public:newsletter',
    maxRequests: 5,
    windowSeconds: 10 * 60, // 5 requests per 10 minutes
  },
  ASSISTANT: {
    bucketName: 'public:assistant',
    maxRequests: 12,
    windowSeconds: 60, // 12 requests per minute
  },
  ATTENDANCE_CHECKIN: {
    bucketName: 'public:attendance_checkin',
    maxRequests: 5,
    windowSeconds: 15 * 60, // 5 requests per 15 minutes
  },
  CERTIFICATE_VERIFY: {
    bucketName: 'public:certificate_verify',
    maxRequests: 10,
    windowSeconds: 15 * 60, // 10 lookups per 15 minutes
  },
} as const satisfies Record<string, RateLimitPolicy>

interface RateLimitEntry {
  timestamps: number[]
  lastSeen: number
}

// In-memory sliding window bucket store
const memoryStore = new Map<string, RateLimitEntry>()
const MAX_MEMORY_ENTRIES = 25_000

// In-memory idempotency / duplicate submission cache
interface DuplicateEntry {
  hash: string
  timestamp: number
  reference?: string
}
const duplicateStore = new Map<string, DuplicateEntry>()
const MAX_DUPLICATE_ENTRIES = 10_000

/**
 * Validates if a string is a well-formed IPv4 or IPv6 address.
 */
function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false
  const trimmed = ip.trim()
  if (trimmed.length < 3 || trimmed.length > 45) return false

  // IPv4 check: 4 octets 0-255
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
    const octets = trimmed.split('.').map(Number)
    return octets.every((o) => o >= 0 && o <= 255)
  }

  // IPv6 check: hex characters and colons
  if (/^[0-9a-fA-F:]+$/.test(trimmed) && trimmed.includes(':')) {
    return true
  }

  return false
}

/**
 * Accurately extracts the real client IP address from proxy headers.
 * Header precedence:
 * 1. cf-connecting-ip (Cloudflare)
 * 2. x-real-ip (Nginx / Vercel single proxy)
 * 3. x-forwarded-for (First valid client IP in proxy chain)
 */
export function getClientIp(request: Request): string {
  // 1. Cloudflare connecting IP
  const cfIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cfIp && isValidIp(cfIp)) return cfIp

  // 2. Nginx / reverse proxy real IP
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp && isValidIp(realIp)) return realIp

  // 3. X-Forwarded-For chain: client, proxy1, proxy2
  const xForwardedFor = request.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    const candidates = xForwardedFor.split(',').map((s) => s.trim())
    for (const candidate of candidates) {
      if (isValidIp(candidate)) {
        return candidate
      }
    }
  }

  return '127.0.0.1'
}

/**
 * Evicts expired entries from the in-memory rate-limiter when capacity threshold is reached.
 */
function evictExpiredEntries(now: number) {
  if (memoryStore.size < MAX_MEMORY_ENTRIES) return

  for (const [key, entry] of memoryStore.entries()) {
    // If no requests in the last 2 hours, delete
    if (now - entry.lastSeen > 2 * 3600 * 1000) {
      memoryStore.delete(key)
    }
  }

  // If still too full, evict oldest entries
  if (memoryStore.size >= MAX_MEMORY_ENTRIES) {
    const sorted = Array.from(memoryStore.entries()).sort(
      (a, b) => a[1].lastSeen - b[1].lastSeen
    )
    for (let i = 0; i < Math.floor(MAX_MEMORY_ENTRIES * 0.2); i++) {
      if (sorted[i]) memoryStore.delete(sorted[i][0])
    }
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
  totalLimit: number
}

/**
 * Checks rate limit using sliding-window algorithm.
 */
export async function checkRateLimit(
  request: Request,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const clientIp = getClientIp(request)
  const key = `${policy.bucketName}:${clientIp}`
  const now = Date.now()
  const windowMs = policy.windowSeconds * 1000
  const windowStart = now - windowMs

  // Try Upstash / Redis if configured in environment
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (upstashUrl && upstashToken) {
    try {
      // Use Redis sorted set for atomic sliding window
      // ZREMRANGEBYSCORE key 0 windowStart
      // ZADD key now now
      // ZCARD key
      // EXPIRE key windowSeconds
      const pipelineRes = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['ZREMRANGEBYSCORE', key, 0, windowStart],
          ['ZADD', key, now, `${now}-${Math.random().toString(36).slice(2, 7)}`],
          ['ZCARD', key],
          ['EXPIRE', key, policy.windowSeconds * 2],
        ]),
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      })

      if (pipelineRes.ok) {
        const data = (await pipelineRes.json()) as Array<{ result?: unknown }>
        const count = typeof data[2]?.result === 'number' ? data[2].result : 1
        const allowed = count <= policy.maxRequests
        const remaining = Math.max(0, policy.maxRequests - count)
        const retryAfterSeconds = allowed ? 0 : Math.ceil(policy.windowSeconds / policy.maxRequests)

        return {
          allowed,
          remaining,
          retryAfterSeconds: retryAfterSeconds || policy.windowSeconds,
          totalLimit: policy.maxRequests,
        }
      }
    } catch {
      // Fallback cleanly to in-memory store if Redis is unreachable
    }
  }

  // In-memory sliding window implementation
  evictExpiredEntries(now)

  let entry = memoryStore.get(key)
  if (!entry) {
    entry = { timestamps: [], lastSeen: now }
    memoryStore.set(key, entry)
  }

  // Filter timestamps outside current sliding window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart)
  entry.lastSeen = now

  if (entry.timestamps.length >= policy.maxRequests) {
    const oldestInWindow = entry.timestamps[0] || windowStart
    const retryAfterMs = oldestInWindow + windowMs - now
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000))

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      totalLimit: policy.maxRequests,
    }
  }

  entry.timestamps.push(now)
  const remaining = policy.maxRequests - entry.timestamps.length

  return {
    allowed: true,
    remaining,
    retryAfterSeconds: 0,
    totalLimit: policy.maxRequests,
  }
}

/**
 * Checks for rapid identical duplicate submissions (idempotency window).
 * Prevents accidental double-clicks, browser replay, or rapid repeated form submissions.
 * Returns true if this is an identical repeat within `windowSeconds`.
 */
export function checkDuplicateSubmission(
  endpoint: string,
  identityKey: string,
  payloadDigest: string,
  windowSeconds = 60,
): { isDuplicate: boolean; ageSeconds?: number; reference?: string } {
  const now = Date.now()
  const key = `${endpoint}:${identityKey.toLowerCase().trim()}`
  const existing = duplicateStore.get(key)

  // Clean old duplicate entries
  if (duplicateStore.size > MAX_DUPLICATE_ENTRIES) {
    for (const [k, v] of duplicateStore.entries()) {
      if (now - v.timestamp > 300_000) {
        duplicateStore.delete(k)
      }
    }
  }

  if (existing) {
    const ageMs = now - existing.timestamp
    if (ageMs < windowSeconds * 1000 && existing.hash === payloadDigest) {
      return {
        isDuplicate: true,
        ageSeconds: Math.floor(ageMs / 1000),
        reference: existing.reference,
      }
    }
  }

  return { isDuplicate: false }
}

/**
 * Records a successful submission in the idempotency cache.
 */
export function recordSubmission(
  endpoint: string,
  identityKey: string,
  payloadDigest: string,
  reference?: string,
) {
  const key = `${endpoint}:${identityKey.toLowerCase().trim()}`
  duplicateStore.set(key, {
    hash: payloadDigest,
    timestamp: Date.now(),
    reference,
  })
}
