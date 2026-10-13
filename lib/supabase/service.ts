import { createSqliteClient, type SqliteClient } from '../db/sqlite-adapter'
import { createSupabaseRestClient } from '../db/supabase-rest-adapter'
import { getSupabaseRuntimeConfig } from './config'

/**
 * Uses Supabase PostgREST with a server-only key when configured. Local
 * development keeps SQLite as a fallback so existing contributors can run
 * the site without a hosted project.
 */
export type SupabaseServiceClient = SqliteClient & {
  storage?: { from: (bucket: string) => any }
  rpc?: (name: string, args?: Record<string, unknown>) => Promise<{ data: any; error: import('../db/sqlite-adapter').PostgrestError | null }>
}

export function createSupabaseServiceClient(): SupabaseServiceClient {
  const config = getSupabaseRuntimeConfig()
  if (config) return createSupabaseRestClient(config) as unknown as SqliteClient
  return createSqliteClient()
}
