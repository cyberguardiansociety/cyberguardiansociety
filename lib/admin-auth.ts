import 'server-only'
import { cache } from 'react'
import { redirect, notFound } from 'next/navigation'
import { adminUrl } from '@/lib/admin-config'
import { getVerifiedAdminSession } from '@/lib/security/session'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const ADMIN_PERMISSION_KEYS = [
  'sessions',
  'applications',
  'inbox',
  'activity',
  'speaker_applications',
  'speakers',
  'content_announcement',
  'content_product',
  'content_merchandise',
  'content_resource',
  'google_sync',
  'payments',
  'admins',
  'audit',
] as const

export type AdminPermission = (typeof ADMIN_PERMISSION_KEYS)[number]

export function hasAdminPermission(
  admin: { role: string; permission_keys?: string[] | null },
  permission: AdminPermission,
) {
  return admin.role === 'super_admin' || admin.role === 'admin' || Boolean(admin.permission_keys?.includes(permission))
}

export const getAdminContext = cache(async function getAdminContext() {
  // Require the signed application admin session
  const verifiedSession = await getVerifiedAdminSession()
  if (!verifiedSession) {
    return null
  }

  // Lookup admin user from database
  const database = createSupabaseServiceClient()
  const { data: adminRecord, error } = await database.from('admin_users')
    .select('user_id, role, permission_keys, active')
    .eq('user_id', verifiedSession.userId)
    .maybeSingle()

  if (error || !adminRecord || (adminRecord.active !== true && adminRecord.active !== 1)) {
    return null
  }

  let permissionKeys: string[] = []
  try {
    const parsed = Array.isArray(adminRecord.permission_keys)
      ? adminRecord.permission_keys
      : adminRecord.permission_keys ? JSON.parse(adminRecord.permission_keys) : []
    if (Array.isArray(parsed)) permissionKeys = parsed.filter((key): key is string => typeof key === 'string')
  } catch {
    // A malformed permission list must never lock every administrator out;
    // role-based access (super_admin/admin) still applies.
    permissionKeys = []
  }

  const adminData = {
    user_id: adminRecord.user_id,
    role: adminRecord.role || 'super_admin',
    permission_keys: permissionKeys,
  }

  return {
    user: { id: verifiedSession.userId, email: verifiedSession.email },
    admin: adminData,
    supabase: createSupabaseServiceClient(),
  }
})

export async function requireAdmin() {
  const context = await getAdminContext()
  if (!context) {
    // Unauthenticated access to admin routes returns generic 404
    notFound()
  }
  return context
}

export async function requirePermission(permission: AdminPermission) {
  const context = await requireAdmin()
  if (!hasAdminPermission(context.admin, permission)) {
    redirect(adminUrl('', { error: 'forbidden' }))
  }
  return context
}
