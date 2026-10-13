export type SupabaseRuntimeConfig = {
  url: string
  secretKey: string
}

/**
 * Read only server-side Supabase credentials. The key must be a secret/service
 * key because the website uses its own signed admin sessions, not Supabase Auth.
 */
export function getSupabaseRuntimeConfig(): SupabaseRuntimeConfig | null {
  const url = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ''
  ).trim().replace(/\/+$/, '')
  const secretKey = (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ''
  ).trim()

  if (!url && !secretKey) {
    if (process.env.VERCEL === '1') {
      throw new Error('Supabase server credentials are required in the Vercel environment.')
    }
    return null
  }

  if (!url || !secretKey) {
    throw new Error('Set both SUPABASE_URL and SUPABASE_SECRET_KEY for the hosted database.')
  }
  if (secretKey.startsWith('sb_publishable_')) {
    throw new Error('SUPABASE_SECRET_KEY must be a server-side secret key, not a publishable key.')
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('SUPABASE_URL must be a valid HTTPS URL.')
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
    throw new Error('SUPABASE_URL must use HTTPS.')
  }

  return { url, secretKey }
}

export function isSupabaseRuntimeConfigured(): boolean {
  return getSupabaseRuntimeConfig() !== null
}
