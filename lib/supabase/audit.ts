import { randomUUID } from 'crypto'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export type AuditEntry = {
  actor_id?: string
  action: string
  entity: string
  entity_id?: string | null
  details?: unknown
}

/**
 * Writes an entry to the configured database's `admin_audit_log` table.
 * Never throws: audit failures must not break the calling operation.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const { error } = await createSupabaseServiceClient().from('admin_audit_log').insert({
      id: randomUUID(),
      actor_id: entry.actor_id || 'system',
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id ?? null,
      details: entry.details ?? null,
      created_at: new Date().toISOString(),
    })
    if (error) throw new Error(error.message)
  } catch (err) {
    console.warn('[audit] Failed to write audit entry:', err)
  }
}
