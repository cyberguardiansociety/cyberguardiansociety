import { createSqliteClient, type SqliteClient } from '@/lib/db/sqlite-adapter'

/**
 * Supabase-compatible server client backed by the local SQLite database.
 * The async signature matches the previous cookie-based Supabase server client.
 */
export async function createSupabaseServerClient(): Promise<SqliteClient> {
  return createSqliteClient()
}
