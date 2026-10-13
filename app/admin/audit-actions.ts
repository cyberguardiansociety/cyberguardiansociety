'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { adminUrl } from '@/lib/admin-config'

const DELETE_AUDIT_LOGS_PHRASE = 'DELETE ALL AUDIT LOGS'

function returnToActivity(result: { status?: string; error?: string }): never {
  revalidatePath('/admin')
  redirect(adminUrl('', { view: 'activity', ...result }))
}

export async function clearAllAuditLogs(formData: FormData) {
  const { admin, supabase } = await requireAdmin()

  if (admin.role !== 'super_admin') {
    returnToActivity({ error: 'forbidden' })
  }

  if (formData.get('confirmation') !== DELETE_AUDIT_LOGS_PHRASE) {
    returnToActivity({ error: 'audit-delete-confirmation' })
  }

  try {
    const { error } = await supabase.from('admin_audit_log').delete()
    if (error) returnToActivity({ error: 'audit-delete' })
  } catch {
    returnToActivity({ error: 'audit-delete' })
  }

  returnToActivity({ status: 'audit-logs-cleared' })
}
