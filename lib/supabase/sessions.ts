import { getPublicOnlineSessions } from '@/lib/sessions-store'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Reads the published online sessions for the public website.
 */
export async function readPublicOnlineSessions(): Promise<{
  current: import('@/data/site').OnlineSession[]
  upcoming: import('@/data/site').OnlineSession[]
}> {
  const supabase = await createSupabaseServerClient()
  return getPublicOnlineSessions(supabase)
}
