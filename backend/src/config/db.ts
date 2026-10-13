import { createSqliteClient, type SqliteClient } from '../../../lib/db/sqlite-adapter'
import { initializeDatabase } from '../../../lib/db'
import { logger } from '../utils/logger'

let sqliteClient: SqliteClient | null = null

/**
 * Returns the shared SQLite-backed database client for the backend.
 * Replaces the former Supabase service client.
 */
export function getDbClient(): SqliteClient {
  if (!sqliteClient) {
    sqliteClient = createSqliteClient()
  }
  return sqliteClient
}

/**
 * Validates database connectivity on startup.
 */
export async function checkDbHealth(): Promise<boolean> {
  try {
    await initializeDatabase()
    const { error } = await getDbClient().from('cgs_inbox_messages').select('id').limit(1)
    return !error
  } catch (err) {
    logger.error('Database health check failed:', err)
    return false
  }
}
