import { headers } from 'next/headers'
import { logSecurityEvent } from '@/lib/security/logger'
import { isSupabaseRuntimeConfigured } from '@/lib/supabase/config'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const ipBuckets = new Map<string, RateLimitEntry>()

export async function extractClientIp(): Promise<string> {
  const headerList = await headers()

  // 1. Cloudflare header
  const cfIp = headerList.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()

  // 2. Standard X-Forwarded-For (leftmost is client IP)
  const forwardedFor = headerList.get('x-forwarded-for')
  if (forwardedFor) {
    const ips = forwardedFor.split(',')
    if (ips.length > 0 && ips[0].trim()) {
      return ips[0].trim()
    }
  }

  // 3. X-Real-IP
  const realIp = headerList.get('x-real-ip')
  if (realIp) return realIp.trim()

  return '127.0.0.1'
}

/**
 * Checks sliding window rate limit for an IP and action.
 */
export async function checkRateLimit(
  ip: string,
  keyPrefix = 'admin-login',
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const key = `${keyPrefix}:${ip}`
  const now = Date.now()

  if (isSupabaseRuntimeConfigured()) {
    const { data, error } = await createSupabaseServiceClient().rpc?.('consume_admin_ip_rate_limit', {
      p_limit_key: key,
      p_max_requests: maxAttempts,
      p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    }) ?? { data: null, error: { message: 'Remote login rate limiter is unavailable.', details: '', hint: '', code: 'RPC_UNAVAILABLE' } }
    if (error || !data || typeof data !== 'object') throw new Error('Administrator rate limit could not be checked.')
    const result = data as { allowed: boolean; remaining: number; retryAfterSeconds: number }
    if (!result.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', `Admin rate limit exceeded for IP: ${ip}`, {
        ip, path: keyPrefix, severity: 'warn', details: { maxAttempts, retryAfterSeconds: result.retryAfterSeconds },
      })
    }
    return result
  }

  let entry = ipBuckets.get(key)
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs }
    ipBuckets.set(key, entry)
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (entry.count >= maxAttempts) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
    logSecurityEvent('RATE_LIMIT_EXCEEDED', `Admin rate limit exceeded for IP: ${ip}`, {
      ip,
      path: keyPrefix,
      severity: 'warn',
      details: { maxAttempts, retryAfterSeconds },
    })

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    }
  }

  entry.count += 1
  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  }
}

/**
 * Periodically purge expired rate limit entries to prevent memory buildup
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of ipBuckets.entries()) {
    if (now > entry.resetAt) {
      ipBuckets.delete(key)
    }
  }
}, 5 * 60 * 1000).unref()
