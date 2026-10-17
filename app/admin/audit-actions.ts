'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/admin-auth'
import { adminUrl } from '@/lib/admin-config'

const DELETE_AUDIT_LOGS_PHRASE = 'DELETE ALL AUDIT LOGS'

function returnToActivity(result: { status?: string; error?: string }): never {
  revalidatePath('/admin')
  redirect(adminUrl('', { view: 'activity', ...result }))
}

export async function clearAllAuditLogs(formData: FormData) {
  const { supabase } = await requirePermission('audit')

  const confirmation = String(formData.get('confirmation') || '').trim().toUpperCase()

  if (confirmation !== DELETE_AUDIT_LOGS_PHRASE) {
    returnToActivity({ error: 'audit-delete-confirmation' })
  }

  try {
    // Attempt deletion with neq which works on all adapters and satisfies PostgREST's required filter
    const res = await supabase.from('admin_audit_log').delete().neq('id', '__cgs_never_matches__')
    if (res.error) {
      console.warn('[clearAllAuditLogs] neq delete returned error, trying fallback:', res.error)
      const fallback = await supabase.from('admin_audit_log').delete().not('id', 'is', null)
      if (fallback.error) {
        console.error('[clearAllAuditLogs] fallback delete failed:', fallback.error)
        returnToActivity({ error: 'audit-delete' })
      }
    }
  } catch (err) {
    console.error('[clearAllAuditLogs] exception during delete:', err)
    returnToActivity({ error: 'audit-delete' })
  }

  returnToActivity({ status: 'audit-logs-cleared' })
}
