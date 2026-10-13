import { randomUUID } from 'crypto'
import { initializeDatabase, insert } from '@/lib/db'

export type AuditEntry = {
  actor_id?: string
  action: string
  entity: string
  entity_id?: string | null
  details?: unknown
}

/**
 * Writes an entry to the admin audit log (SQLite `admin_audit_log`).
 * Never throws: audit failures must not break the calling operation.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await initializeDatabase()
    await insert('admin_audit_log', {
      id: randomUUID(),
      actor_id: entry.actor_id || 'system',
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id ?? null,
      details:
        entry.details === undefined || entry.details === null
          ? null
          : JSON.stringify(entry.details),
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[audit] Failed to write audit entry:', err)
  }
}
