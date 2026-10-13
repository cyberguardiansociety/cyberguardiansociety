import { createSqliteClient, type SqliteClient } from '@/lib/db/sqlite-adapter'

/**
 * Supabase-compatible service client backed by the local SQLite database.
 * Bypasses row-level security in the same way the service-role client did;
 * access control is enforced by the call sites through requirePermission().
 */
export function createSupabaseServiceClient(): SqliteClient {
  return createSqliteClient()
}
