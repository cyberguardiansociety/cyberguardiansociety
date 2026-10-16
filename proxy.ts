import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_BASE_PATH, ADMIN_IP_ALLOWLIST, SESSION_SECRET } from '@/lib/admin-config'
import { logSecurityEvent } from '@/lib/security/logger'
import { getMaintenanceSettings } from '@/lib/portal-settings'
import { refreshAdminSessionToken } from '@/lib/security/session-token'

const DECOY_PATHS = new Set([
  '/admin',
  '/admin/panel',
  '/login',
  '/wp-admin',
  '/wp-login.php',
  '/administrator',
  '/cpanel',
])
const INTERNAL_ADMIN_REWRITE_HEADER = 'x-cgs-internal-admin-rewrite'
const INTERNAL_ADMIN_NONCE_HEADER = 'x-cgs-internal-admin-nonce'
const INTERNAL_ADMIN_PATH_HEADER = 'x-cgs-internal-admin-path'
const ADMIN_SESSION_COOKIE = '__cgs_admin_session'

function getInternalAdminRewriteSignature(nonce: string, path: string) {
  return createHmac('sha256', SESSION_SECRET).update(`${nonce}\n${path}`).digest('hex')
}

function isInternalAdminRewrite(request: NextRequest) {
  const signature = request.headers.get(INTERNAL_ADMIN_REWRITE_HEADER)
  const nonce = request.headers.get(INTERNAL_ADMIN_NONCE_HEADER)
  const originalPath = request.headers.get(INTERNAL_ADMIN_PATH_HEADER)
  if (
    !signature ||
    !nonce ||
    !originalPath ||
    !(originalPath === ADMIN_BASE_PATH || originalPath.startsWith(`${ADMIN_BASE_PATH}/`)) ||
    !(request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/'))
  ) {
    return false
  }

  const expected = Buffer.from(getInternalAdminRewriteSignature(nonce, originalPath))
  const received = Buffer.from(signature)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

function getClientIpFromRequest(request: NextRequest): string {
  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const ips = forwarded.split(',')
    if (ips.length > 0 && ips[0].trim()) {
      return ips[0].trim()
    }
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return '127.0.0.1'
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const clientIp = getClientIpFromRequest(request)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV === 'development'
  const connectSources = ["'self'", 'https://api.groq.com']
  if (isDev) connectSources.push('ws://localhost:*', 'ws://127.0.0.1:*')

  const cspHeader = [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "script-src-attr 'none'",
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self' https://www.google.com https://maps.google.com",
    ...(!isDev ? ['upgrade-insecure-requests'] : []),
  ].join('; ')

  const createSecurityHeaders = (headers: Headers) => {
    headers.set('x-nonce', nonce)
    headers.set('Content-Security-Policy', cspHeader)
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'DENY')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  }

  // ==========================================
  // 1. HONEYPOT / DECOY INTERCEPTION
  // ==========================================
  const lowerPath = pathname.toLowerCase()
  const isAdminLoginAlias = lowerPath === '/admin/login'
  const isAdminPath = lowerPath === '/admin' || lowerPath.startsWith('/admin/')

  // If a verified admin accesses /admin directly, redirect them to the configured secret admin route
  if (isAdminPath && !isInternalAdminRewrite(request) && !isAdminLoginAlias) {
    const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
    const hasValidSession = sessionToken ? Boolean(refreshAdminSessionToken(sessionToken)) : false
    if (hasValidSession) {
      const internalSubPath = pathname.slice('/admin'.length) || ''
      const targetUrl = new URL(`${ADMIN_BASE_PATH}${internalSubPath}${request.nextUrl.search}`, request.url)
      return NextResponse.redirect(targetUrl)
    }
  }

  if (
    !isInternalAdminRewrite(request) &&
    !isAdminLoginAlias &&
    (DECOY_PATHS.has(lowerPath) || lowerPath.startsWith('/admin/'))
  ) {
    logSecurityEvent('HONEYPOT_HIT', `Decoy probe detected on path: ${pathname}`, {
      ip: clientIp,
      userAgent: request.headers.get('user-agent') || undefined,
      path: pathname,
      severity: 'warn',
    })

    // Return a generic 404 response indistinguishable from non-existent routes
    const notFoundUrl = new URL('/_not-found', request.url)
    return NextResponse.rewrite(notFoundUrl, { status: 404 })
  }

  // Keep the conventional login alias behind the same optional IP allowlist
  // as the secret admin route.
  if (
    isAdminLoginAlias &&
    ADMIN_IP_ALLOWLIST.length > 0 &&
    !ADMIN_IP_ALLOWLIST.includes(clientIp)
  ) {
    logSecurityEvent('IP_BLOCKED', `Admin login alias rejected from non-allowlisted IP: ${clientIp}`, {
      ip: clientIp,
      path: pathname,
      severity: 'warn',
    })
    const notFoundUrl = new URL('/_not-found', request.url)
    return NextResponse.rewrite(notFoundUrl, { status: 404 })
  }

  // ==========================================
  // 2. DYNAMIC SECRET ADMIN PATH HANDLING
  // ==========================================
  const isSecretAdminRoute = pathname === ADMIN_BASE_PATH || pathname.startsWith(`${ADMIN_BASE_PATH}/`)

  if (isSecretAdminRoute) {
    // Check IP allowlist if configured
    if (ADMIN_IP_ALLOWLIST.length > 0 && !ADMIN_IP_ALLOWLIST.includes(clientIp)) {
      logSecurityEvent('IP_BLOCKED', `Admin access attempt rejected from non-allowlisted IP: ${clientIp}`, {
        ip: clientIp,
        path: pathname,
        severity: 'warn',
      })
      const notFoundUrl = new URL('/_not-found', request.url)
      return NextResponse.rewrite(notFoundUrl, { status: 404 })
    }

    // Map secret path back to internal /admin routes
    const internalSubPath = pathname.slice(ADMIN_BASE_PATH.length) || ''
    let internalUrl: URL
    const cleanSection = internalSubPath.replace(/^\/+/, '')
    if (cleanSection === 'login' || cleanSection.startsWith('login/')) {
      internalUrl = new URL(`/admin/login${request.nextUrl.search}`, request.url)
    } else if (cleanSection === 'mfa' || cleanSection.startsWith('mfa/')) {
      internalUrl = new URL(`/admin/mfa${request.nextUrl.search}`, request.url)
    } else if (cleanSection) {
      internalUrl = new URL(`/admin${request.nextUrl.search}`, request.url)
      if (!internalUrl.searchParams.has('view')) {
        internalUrl.searchParams.set('view', cleanSection)
      }
    } else {
      internalUrl = new URL(`/admin${request.nextUrl.search}`, request.url)
    }

    const requestHeaders = new Headers(request.headers)
    createSecurityHeaders(requestHeaders)
    const internalRewriteNonce = crypto.randomUUID()
    requestHeaders.set(INTERNAL_ADMIN_NONCE_HEADER, internalRewriteNonce)
    requestHeaders.set(INTERNAL_ADMIN_PATH_HEADER, pathname)
    requestHeaders.set(
      INTERNAL_ADMIN_REWRITE_HEADER,
      getInternalAdminRewriteSignature(internalRewriteNonce, pathname),
    )

    let response = NextResponse.rewrite(internalUrl, {
      request: { headers: requestHeaders },
    })

    // Apply strict administrative response headers
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    createSecurityHeaders(response.headers)

    const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
    if (sessionToken) {
      const refreshedSession = refreshAdminSessionToken(sessionToken)
      if (!refreshedSession) {
        response.cookies.set(ADMIN_SESSION_COOKIE, '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 0,
        })
      } else if (refreshedSession.refreshed) {
        response.cookies.set(ADMIN_SESSION_COOKIE, refreshedSession.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: Math.max(60, Math.floor((refreshedSession.expiresAt - Date.now()) / 1000)),
        })
      }
    }

    return response
  }

  // ==========================================
  // 3. MAINTENANCE MODE
  // ==========================================
  const isProtectedAdminApi = pathname === '/api/admin' || pathname.startsWith('/api/admin/')
  if (!isAdminLoginAlias && !isProtectedAdminApi && pathname !== '/maintenance') {
    try {
      const maintenanceSettings = await getMaintenanceSettings()
      if (maintenanceSettings.enabled) {
        if (pathname === '/api' || pathname.startsWith('/api/')) {
          const response = NextResponse.json(
            {
              error: maintenanceSettings.message,
              code: 'MAINTENANCE_MODE',
            },
            {
              status: 503,
              headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Retry-After': '300',
                'X-Robots-Tag': 'noindex, nofollow',
              },
            },
          )
          createSecurityHeaders(response.headers)
          return response
        }

        const requestHeaders = new Headers(request.headers)
        createSecurityHeaders(requestHeaders)
        const response = NextResponse.rewrite(new URL('/maintenance', request.url), {
          request: { headers: requestHeaders },
        })
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
        response.headers.set('Retry-After', '300')
        response.headers.set('X-Robots-Tag', 'noindex, nofollow')
        createSecurityHeaders(response.headers)
        return response
      }
    } catch {
      // A settings read failure must not lock the public site or admin out.
    }
  }

  // ==========================================
  // 4. PUBLIC WEBSITE HANDLING
  // ==========================================
  const requestHeaders = new Headers(request.headers)
  createSecurityHeaders(requestHeaders)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  createSecurityHeaders(response.headers)

  if (isAdminLoginAlias) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image|robots.txt|sitemap.xml).*)',
  ],
}
