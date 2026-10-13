import type { Metadata } from 'next'

function parseSiteUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined

  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return undefined
    if (url.username || url.password) return undefined
    if (process.env.NODE_ENV === 'production' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
      return undefined
    }

    return new URL(url.origin)
  } catch {
    return undefined
  }
}

function resolveSiteUrl(): URL | undefined {
  const configured = parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
    ?? parseSiteUrl(process.env.SITE_URL)
  if (configured) return configured

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelProductionUrl) {
    return parseSiteUrl(vercelProductionUrl.startsWith('http')
      ? vercelProductionUrl
      : `https://${vercelProductionUrl}`)
  }

  return process.env.NODE_ENV === 'production' ? undefined : new URL('http://localhost:3000')
}

/** The configured public origin. Production intentionally has no localhost fallback. */
export const siteUrl = resolveSiteUrl()

/** Adds a canonical URL only when a real public site origin is configured. */
export function canonicalMetadata(path: string): Pick<Metadata, 'alternates'> | Record<string, never> {
  return siteUrl ? { alternates: { canonical: path } } : {}
}

/** Safely serializes trusted JSON-LD so text cannot terminate its script element. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
