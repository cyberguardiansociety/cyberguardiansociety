'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { adminUrl } from '@/lib/admin-config'
import { savePortalSetting, saveMaintenanceMessage as persistMaintenanceMessage, resetPortalSettings, type PortalSettingKey } from '@/lib/portal-settings'
import { clearAllAccountLockouts } from '@/lib/security/lockout'
import { deleteAllDraftManagedContent } from '@/lib/managed-content-store'
import { logAudit } from '@/lib/supabase/audit'

const settingKeys: PortalSettingKey[] = [
  'portal_open',
  'attendance_open',
  'join_cgs_coming_soon',
  'speaker_coming_soon',
  'maintenance_mode',
]

async function requireSuperAdmin() {
  const context = await requireAdmin()
  if (context.admin.role !== 'super_admin') redirect(adminUrl('', { view: 'overview', error: 'forbidden' }))
  return context
}

function returnToSettings(tab: string, result: { status?: string; error?: string }): never {
  revalidatePath('/admin')
  revalidatePath('/join-cgs')
  revalidatePath('/join-as-speaker')
  revalidatePath('/maintenance')
  revalidatePath('/api/attendance')
  redirect(adminUrl('', { view: 'settings', tab, ...result }))
}

export async function changePortalSetting(formData: FormData) {
  const { user } = await requireSuperAdmin()
  const key = formData.get('key')
  const value = formData.get('value')
  if (typeof key !== 'string' || !settingKeys.includes(key as PortalSettingKey) || (value !== 'true' && value !== 'false')) {
    returnToSettings(key === 'maintenance_mode' ? 'maintenance' : 'general', { error: 'settings-save' })
  }

  try {
    await savePortalSetting(key as PortalSettingKey, value === 'true')
    await logAudit({ actor_id: user.id, action: 'update', entity: 'portal_setting', entity_id: key, details: { value } })
  } catch {
    const tab = key === 'maintenance_mode'
      ? 'maintenance'
      : key === 'join_cgs_coming_soon' || key === 'speaker_coming_soon'
        ? 'forms'
        : 'general'
    returnToSettings(tab, { error: 'settings-save' })
  }
  const tab = key === 'maintenance_mode'
    ? 'maintenance'
    : key === 'join_cgs_coming_soon' || key === 'speaker_coming_soon'
      ? 'forms'
      : 'general'
  returnToSettings(tab, { status: 'setting-saved' })
}

export async function saveMaintenanceMessage(formData: FormData) {
  const { user } = await requireSuperAdmin()
  const rawMessage = formData.get('message')
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : ''
  if (message.length < 10 || message.length > 500) {
    returnToSettings('maintenance', { error: 'settings-save' })
  }

  try {
    await persistMaintenanceMessage(message)
    await logAudit({
      actor_id: user.id,
      action: 'update',
      entity: 'portal_setting',
      entity_id: 'maintenance_message',
      details: { characters: message.length },
    })
  } catch {
    returnToSettings('maintenance', { error: 'settings-save' })
  }
  returnToSettings('maintenance', { status: 'maintenance-message-saved' })
}

const dangerActions = {
  'reset-settings': { phrase: 'RESET CGS SETTINGS', tab: 'danger-zone' },
  'clear-lockouts': { phrase: 'CLEAR ALL LOGIN LOCKOUTS', tab: 'danger-zone' },
  'delete-drafts': { phrase: 'DELETE ALL DRAFT CONTENT', tab: 'danger-zone' },
} as const

export async function runDangerZoneAction(formData: FormData) {
  const { user, supabase } = await requireSuperAdmin()
  const action = formData.get('action')
  const confirmation = formData.get('confirmation')
  if (typeof action !== 'string' || !Object.prototype.hasOwnProperty.call(dangerActions, action)) {
    returnToSettings('danger-zone', { error: 'settings-action' })
  }

  const actionConfig = dangerActions[action as keyof typeof dangerActions]
  if (confirmation !== actionConfig.phrase) {
    returnToSettings(actionConfig.tab, { error: 'settings-confirmation' })
  }

  let successStatus: string
  try {
    if (action === 'reset-settings') {
      await resetPortalSettings()
      await logAudit({ actor_id: user.id, action: 'reset', entity: 'portal_settings', details: { scope: 'all site settings' } })
      successStatus = 'settings-reset'
    } else if (action === 'clear-lockouts') {
      const cleared = clearAllAccountLockouts()
      await logAudit({ actor_id: user.id, action: 'clear', entity: 'admin_login_lockouts', details: { records_cleared: cleared } })
      successStatus = 'lockouts-cleared'
    } else {
      const deleted = await deleteAllDraftManagedContent(supabase)
      await logAudit({ actor_id: user.id, action: 'bulk_delete', entity: 'cgs_managed_content_drafts', details: { records_deleted: deleted } })
      successStatus = 'draft-content-deleted'
    }
  } catch {
    returnToSettings(actionConfig.tab, { error: 'settings-action' })
  }
  returnToSettings(actionConfig.tab, { status: successStatus! })
}
