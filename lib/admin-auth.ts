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
  'admins',
  'audit',
] as const

export type AdminPermission = (typeof ADMIN_PERMISSION_KEYS)[number]

export const VALID_ADMIN_ROLES = ['super_admin', 'admin', 'limited_admin'] as const
export type AdminRole = (typeof VALID_ADMIN_ROLES)[number]

export type AdminUserContext = {
  user_id: string
  role: AdminRole
  permission_keys: AdminPermission[]
}

export type AdminAuthContext = {
  user: { id: string; email: string }
  admin: AdminUserContext
}

export type AdminPermissionContext = AdminAuthContext & {
  supabase: ReturnType<typeof createSupabaseServiceClient>
}

/**
 * Validates permission against role & explicit keys:
 * - Only 'super_admin' skips permission checks completely.
 * - 'admins' and 'audit' strictly require an explicit key for everyone else.
 * - For non-sensitive permissions, 'admin' role has access, while 'limited_admin' requires the explicit key.
 */
export function hasAdminPermission(
  admin: { role: string; permission_keys?: string[] | null },
  permission: AdminPermission,
): boolean {
  if (admin.role === 'super_admin') {
    return true
  }

  // Sensitive security operations strictly require an explicit key
  const sensitivePermissions: AdminPermission[] = ['admins', 'audit']
  if (sensitivePermissions.includes(permission)) {
    return Boolean(admin.permission_keys?.includes(permission))
  }

  if (admin.role === 'admin') {
    return true
  }

  return Boolean(admin.permission_keys?.includes(permission))
}

/**
 * Deprecated memory cache stub maintained for interface compatibility.
 * Database is queried on every request to guarantee instant revocation.
 */
export function invalidateAdminCache(_userId?: string) {
  // Database lookup occurs on each request cycle; no cross-instance stale cache.
}

/**
 * Retrieves the current authenticated admin context.
 * Deduplicated per-request via React cache().
 * Queries database on each request to ensure immediate revocation.
 * Does NOT hand out the service client freely.
 */
export const getAdminContext = cache(async function getAdminContext(): Promise<AdminAuthContext | null> {
  // 1. Require signed, unexpired session cookie
  const verifiedSession = await getVerifiedAdminSession()
  if (!verifiedSession) {
    return null
  }

  // 2. Query database on every request to ensure instant revocation & permissions sync
  let adminRecord: any = null
  try {
    const database = createSupabaseServiceClient()
    const { data, error } = await database
      .from('admin_users')
      .select('user_id, role, permission_keys, active')
      .eq('user_id', verifiedSession.userId)
      .maybeSingle()

    if (error) {
      console.error('[admin-auth] Database error while fetching admin record for userId:', verifiedSession.userId, error)
      return null
    }
    adminRecord = data
  } catch (err) {
    console.error('[admin-auth] Unexpected exception querying admin_users table:', err)
    return null
  }

  // 3. User must exist in admin_users table
  if (!adminRecord) {
    console.warn('[admin-auth] Admin record not found in database for session userId:', verifiedSession.userId)
    return null
  }

  // 4. Normalize and verify active status (boolean, 1, or 'true')
  const isActive = adminRecord.active === true || adminRecord.active === 1 || adminRecord.active === 'true'
  if (!isActive) {
    console.warn('[admin-auth] Inactive or suspended admin access attempted by userId:', verifiedSession.userId)
    return null
  }

  // 5. Strictly validate role without silent fallback to super_admin
  if (!adminRecord.role || !VALID_ADMIN_ROLES.includes(adminRecord.role as AdminRole)) {
    console.error('[admin-auth] Missing or unknown role in admin record for userId:', verifiedSession.userId, adminRecord.role)
    return null
  }
  const role = adminRecord.role as AdminRole

  // 6. Validate and sanitize permission keys against ADMIN_PERMISSION_KEYS
  let permissionKeys: AdminPermission[] = []
  try {
    const rawKeys = Array.isArray(adminRecord.permission_keys)
      ? adminRecord.permission_keys
      : typeof adminRecord.permission_keys === 'string'
        ? JSON.parse(adminRecord.permission_keys)
        : []

    if (Array.isArray(rawKeys)) {
      permissionKeys = rawKeys.filter((key): key is AdminPermission =>
        typeof key === 'string' && (ADMIN_PERMISSION_KEYS as readonly string[]).includes(key),
      )
    }
  } catch (err) {
    console.warn('[admin-auth] Malformed permission_keys for userId:', verifiedSession.userId, err)
    permissionKeys = []
  }

  const adminData: AdminUserContext = {
    user_id: adminRecord.user_id,
    role,
    permission_keys: permissionKeys,
  }

  const userData = { id: verifiedSession.userId, email: verifiedSession.email }

  return {
    user: userData,
    admin: adminData,
  }
})

/**
 * Requires an authenticated, active admin user.
 * Returns { user, admin }. Does NOT return supabase client without a permission check.
 */
export async function requireAdmin(): Promise<AdminAuthContext> {
  const context = await getAdminContext()
  if (!context) {
    // Unauthenticated access to admin routes returns generic 404
    notFound()
  }
  return context
}

/**
 * Requires a specific permission key.
 * Only returns the Supabase service client once permission check passes.
 */
export async function requirePermission(permission: AdminPermission): Promise<AdminPermissionContext> {
  const context = await requireAdmin()
  if (!hasAdminPermission(context.admin, permission)) {
    redirect(adminUrl('', { error: 'forbidden' }))
  }
  return {
    ...context,
    supabase: createSupabaseServiceClient(),
  }
}
