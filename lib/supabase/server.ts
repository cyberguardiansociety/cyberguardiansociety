import type { SqliteClient } from '@/lib/db/sqlite-adapter'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

/**
 * Creates the server-side application database client. Cookie authentication is
 * handled by the site's signed admin session; database reads use the service
 * client only from server code.
 */
export async function createSupabaseServerClient(): Promise<SqliteClient> {
  return createSupabaseServiceClient()
}
