'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin, hasAdminPermission } from '@/lib/admin-auth'
import { clearAllCertificateLogs, deleteCertificateLog, purgeInvalidCertificateLogs } from '@/lib/certificate-logs-store'
import { logAudit } from '@/lib/supabase/audit'

export async function clearAllCertificateLogsAction(formData: FormData) {
  const { user, admin } = await requireAdmin()

  if (admin.role !== 'super_admin' && !hasAdminPermission(admin, 'audit') && !hasAdminPermission(admin, 'sessions')) {
    redirect('/admin?view=certificate-logs&error=forbidden')
  }

  const confirmation = String(formData.get('confirmation') || '').trim()
  if (confirmation !== 'DELETE ALL LOGS') {
    redirect('/admin?view=certificate-logs&error=audit-delete-confirmation')
  }

  const deletedCount = await clearAllCertificateLogs()

  try {
    await logAudit({
      actor_id: user.id,
      action: 'delete_all',
      entity: 'cgs_certificate_logs',
      entity_id: 'all',
      details: { deleted_count: deletedCount, cleared_by: user.email },
    })
  } catch (err) {
    console.warn('[Audit Log] Failed to log certificate logs clear:', err)
  }

  revalidatePath('/admin')
  redirect('/admin?view=certificate-logs&status=certificate-logs-cleared')
}

export async function deleteCertificateLogAction(formData: FormData) {
  const { user, admin } = await requireAdmin()

  if (admin.role !== 'super_admin' && !hasAdminPermission(admin, 'audit') && !hasAdminPermission(admin, 'sessions')) {
    redirect('/admin?view=certificate-logs&error=forbidden')
  }

  const id = String(formData.get('id') || '').trim()
  if (!id) {
    redirect('/admin?view=certificate-logs&error=invalid')
  }

  await deleteCertificateLog(id)

  try {
    await logAudit({
      actor_id: user.id,
      action: 'delete',
      entity: 'cgs_certificate_logs',
      entity_id: id,
      details: { id },
    })
  } catch (err) {
    console.warn('[Audit Log] Failed to log single certificate log deletion:', err)
  }

  revalidatePath('/admin')
  redirect('/admin?view=certificate-logs&status=certificate-log-deleted')
}

export async function purgeInvalidCertificateLogsAction() {
  const { user, admin } = await requireAdmin()

  if (admin.role !== 'super_admin' && !hasAdminPermission(admin, 'audit') && !hasAdminPermission(admin, 'sessions')) {
    redirect('/admin?view=certificate-logs&error=forbidden')
  }

  const purgedCount = await purgeInvalidCertificateLogs()

  try {
    await logAudit({
      actor_id: user.id,
      action: 'purge_invalid',
      entity: 'cgs_certificate_logs',
      entity_id: 'legacy_failed',
      details: { purged_count: purgedCount, purged_by: user.email },
    })
  } catch (err) {
    console.warn('[Audit Log] Failed to log invalid certificate logs purge:', err)
  }

  revalidatePath('/admin')
  redirect('/admin?view=certificate-logs&status=invalid-logs-purged')
}

