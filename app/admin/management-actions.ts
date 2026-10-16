'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { requirePermission } from '@/lib/admin-auth'
import { uploadPublicContentImage } from '@/lib/supabase-storage'
import { hashPassword } from '@/lib/security/password'
import { adminUrl } from '@/lib/admin-config'

const contentTypes = ['announcement', 'product', 'merchandise', 'resource'] as const
const contentPermissions = {
  announcement: 'content_announcement',
  product: 'content_product',
  merchandise: 'content_merchandise',
  resource: 'content_resource',
} as const
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
// The built-in managed-content seed records use canonical UUID-shaped IDs
// with legacy version/variant bits, so keep this relaxed check scoped to them.
const managedContentIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const permissionKeys = [
  'sessions', 'applications', 'inbox', 'activity', 'speaker_applications', 'speakers',
  'content_announcement', 'content_product', 'content_merchandise', 'content_resource',
  'payments', 'audit', 'google_sync',
] as const

function text(formData: FormData, key: string, max: number) {
  const value = formData.get(key)
  if (typeof value !== 'string') return null
  const cleaned = value.trim()
  return cleaned.length <= max ? cleaned : null
}

function safeWebUrl(value: string) {
  if (!value) return ''
  try {
    const url = new URL(value, 'https://cgs.invalid')
    if (url.origin === 'https://cgs.invalid') return `${url.pathname}${url.search}${url.hash}`
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null
  } catch {
    return null
  }
}

function finish(view: string, status: string): never {
  revalidatePath('/')
  revalidatePath('/products')
  revalidatePath('/merch')
  revalidatePath('/announcements')
  revalidatePath('/admin')
  redirect(adminUrl('', { view, status }))
}

function contentType(value: FormDataEntryValue | null): value is (typeof contentTypes)[number] {
  return typeof value === 'string' && contentTypes.includes(value as (typeof contentTypes)[number])
}

export async function saveManagedContent(formData: FormData) {
  const kindValue = formData.get('contentType')
  if (!contentType(kindValue)) redirect(adminUrl('', { error: 'content-invalid' }))
  const kind = kindValue
  const { supabase, user } = await requirePermission(contentPermissions[kind])
  const id = formData.get('id')
  const title = text(formData, 'title', 180)
  const summary = text(formData, 'summary', 800)
  const body = text(formData, 'body', 8000)
  const category = text(formData, 'category', 100)
  const actionUrlValue = text(formData, 'actionUrl', 2048)
  const slugInput = text(formData, 'slug', 180)
  const priceValue = text(formData, 'price', 24) || ''
  const currency = (text(formData, 'currency', 3) || 'USD').toUpperCase()
  const sortOrderValue = text(formData, 'sortOrder', 8) || '0'
  const statusValue = (text(formData, 'status', 16) || 'draft') as 'draft' | 'published' | 'archived'
  const actionUrl = actionUrlValue === null ? null : safeWebUrl(actionUrlValue)
  const sortOrder = Number(sortOrderValue)
  const price = priceValue ? Number(priceValue) : null
  const slug = (slugInput || title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  if (
    !title || title.length < 2 || summary === null || !summary || body === null ||
    actionUrl === null || !slug || slug.length > 180 ||
    (price !== null && (!Number.isFinite(price) || price < 0 || price > 9999999999)) ||
    !/^[A-Z]{3}$/.test(currency) || !Number.isInteger(sortOrder) ||
    !['draft', 'published', 'archived'].includes(statusValue) ||
    (id !== null && (typeof id !== 'string' || !managedContentIdPattern.test(id)))
  ) redirect(adminUrl('', { view: kind === 'merchandise' ? 'merchandise' : kind === 'resource' ? 'resources' : kind === 'announcement' ? 'announcements' : 'products', error: 'content-invalid' }))

  let imageUrl = text(formData, 'existingImageUrl', 2048) || null
  const imageValue = formData.get('image')
  if (imageValue instanceof File && imageValue.size > 0) {
    const uploaded = await uploadPublicContentImage(kind, imageValue)
    if (!uploaded.ok) redirect(adminUrl('', { view: kind === 'merchandise' ? 'merchandise' : kind === 'resource' ? 'resources' : kind === 'announcement' ? 'announcements' : 'products', error: 'image-invalid' }))
    imageUrl = uploaded.url ?? null
  }

  const record = {
    content_type: kind,
    title,
    slug,
    summary,
    body: body || null,
    image_url: imageUrl,
    action_url: actionUrl || null,
    category: category || null,
    price,
    currency,
    status: statusValue,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  }

  // Save to local store + Supabase
  const { saveManagedContentItem } = await import('@/lib/managed-content-store')
  const savedItem = await saveManagedContentItem(
    {
      ...record,
      id: id || undefined,
    },
    user.id,
    supabase,
  )
  const savedId = savedItem.id

  // Log in audit log
  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: typeof id === 'string' ? 'update' : 'create',
      entity: `cgs_managed_content_${kind}`,
      entity_id: String(savedId || title),
      details: { title, slug, status: statusValue, content_type: kind, category, price },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log content save:', auditErr)
  }

  finish(kind === 'merchandise' ? 'merchandise' : kind === 'resource' ? 'resources' : kind === 'announcement' ? 'announcements' : 'products', 'content-saved')
}

export async function deleteManagedContent(formData: FormData) {
  const kindValue = formData.get('contentType')
  const id = formData.get('id')
  if (!contentType(kindValue) || typeof id !== 'string' || !managedContentIdPattern.test(id)) redirect(adminUrl('', { error: 'content-invalid' }))
  const { supabase, user } = await requirePermission(contentPermissions[kindValue])

  const { deleteManagedContentItem } = await import('@/lib/managed-content-store')
  let deleted: boolean
  try {
    deleted = await deleteManagedContentItem(id, kindValue, supabase)
  } catch {
    const view = kindValue === 'merchandise' ? 'merchandise' : kindValue === 'resource' ? 'resources' : kindValue === 'announcement' ? 'announcements' : 'products'
    redirect(adminUrl('', { view, error: 'content-delete' }))
  }
  if (!deleted) {
    const view = kindValue === 'merchandise' ? 'merchandise' : kindValue === 'resource' ? 'resources' : kindValue === 'announcement' ? 'announcements' : 'products'
    redirect(adminUrl('', { view, error: 'content-delete' }))
  }

  // Log in audit log
  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'delete',
      entity: `cgs_managed_content_${kindValue}`,
      entity_id: id,
      details: { content_type: kindValue, id },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log content delete:', auditErr)
  }

  finish(kindValue === 'merchandise' ? 'merchandise' : kindValue === 'resource' ? 'resources' : kindValue === 'announcement' ? 'announcements' : 'products', 'content-deleted')
}

export async function createPaymentEntry(formData: FormData) {
  const { supabase, user } = await requirePermission('payments')
  const entryType = text(formData, 'entryType', 20)
  const status = text(formData, 'status', 20)
  const amount = Number(formData.get('amount'))
  const commissionValue = text(formData, 'commission', 24) || '0'
  const commission = Number(commissionValue)
  const currency = (text(formData, 'currency', 3) || '').toUpperCase()
  const payer = text(formData, 'payer', 180)
  const payee = text(formData, 'payee', 180)
  const reference = text(formData, 'reference', 180)
  const paymentMethod = text(formData, 'paymentMethod', 80)
  const notes = text(formData, 'notes', 2000)
  const occurredAtValue = text(formData, 'occurredAt', 40)
  const occurredAt = occurredAtValue ? new Date(occurredAtValue) : new Date()
  if (
    !['payment', 'refund', 'failed', 'commission'].includes(entryType || '') ||
    !['pending', 'succeeded', 'failed', 'refunded'].includes(status || '') ||
    !Number.isFinite(amount) || amount <= 0 || amount > 9999999999 ||
    !Number.isFinite(commission) || commission < 0 || commission > amount ||
    !/^[A-Z]{3}$/.test(currency) || !payer || !reference ||
    paymentMethod === null || notes === null || !Number.isFinite(occurredAt.getTime())
  ) redirect(adminUrl('', { view: 'payments', error: 'payment-invalid' }))
  const { error } = await supabase.from('cgs_payment_ledger').insert({
    entry_type: entryType,
    status,
    amount,
    currency,
    payer,
    payee: payee || null,
    reference,
    payment_method: paymentMethod || null,
    commission,
    occurred_at: occurredAt.toISOString(),
    notes: notes || null,
    created_by: user.id,
  })
  if (error) redirect(adminUrl('', { view: 'payments', error: 'payment-save' }))

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'create',
      entity: 'cgs_payment_ledger',
      entity_id: reference,
      details: { entry_type: entryType, amount, currency, payer, status },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log payment create:', auditErr)
  }

  finish('payments', 'payment-created')
}

export async function updatePaymentStatus(formData: FormData) {
  const { supabase, user } = await requirePermission('payments')
  const id = formData.get('id')
  const status = formData.get('status')
  if (typeof id !== 'string' || !uuidPattern.test(id) || typeof status !== 'string' || !['pending', 'succeeded', 'failed', 'refunded'].includes(status)) redirect(adminUrl('', { view: 'payments', error: 'payment-invalid' }))
  const { error } = await supabase.from('cgs_payment_ledger').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) redirect(adminUrl('', { view: 'payments', error: 'payment-save' }))

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'update_status',
      entity: 'cgs_payment_ledger',
      entity_id: id,
      details: { status },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log payment status update:', auditErr)
  }

  finish('payments', 'payment-updated')
}

export async function createDelegatedAdmin(formData: FormData) {
  const context = await requirePermission('admins')
  if (context.admin.role !== 'super_admin') redirect(adminUrl('', { error: 'forbidden' }))
  const email = text(formData, 'email', 254)?.toLowerCase() || ''
  const passwordValue = formData.get('password')
  const permissions = formData.getAll('permission').filter((value): value is string => typeof value === 'string' && permissionKeys.includes(value as (typeof permissionKeys)[number]) && value !== 'admins')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(adminUrl('', { view: 'administrators', error: 'admin-invalid-email' }))
  }
  if (typeof passwordValue !== 'string' || passwordValue.length < 12 || passwordValue.length > 128) {
    redirect(adminUrl('', { view: 'administrators', error: 'admin-weak-password' }))
  }
  if (!permissions.length) {
    redirect(adminUrl('', { view: 'administrators', error: 'admin-no-permissions' }))
  }

  // Ensure 'audit' and 'activity' aliases are both saved so all views resolve cleanly
  const normalizedPermissions = permissions.includes('audit') && !permissions.includes('activity')
    ? [...permissions, 'activity']
    : permissions

  const service = createSupabaseServiceClient()
  const { data: created, error: authError } = await service.auth.admin.createUser({
    email,
    password: passwordValue,
    email_confirm: true,
  })
  if (authError || !created.user) {
    console.error('[createDelegatedAdmin] createUser error:', authError)
    const errCode = authError?.message?.toLowerCase().includes('already') ? 'admin-exists' : 'admin-create'
    redirect(adminUrl('', { view: 'administrators', error: errCode }))
  }
  const passwordHash = await hashPassword(passwordValue)
  const { error: profileError } = await service.from('admin_users').insert({
    user_id: created.user.id,
    email: created.user.email,
    password_hash: passwordHash,
    role: 'limited_admin',
    active: true,
    permission_keys: [...new Set(normalizedPermissions)],
  })
  if (profileError) {
    console.error('[createDelegatedAdmin] profileError:', profileError)
    await service.auth.admin.deleteUser(created.user.id)
    redirect(adminUrl('', { view: 'administrators', error: 'admin-create' }))
  }
  await service.from('admin_audit_log').insert({
    actor_id: context.user.id,
    action: 'create',
    entity: 'admin_users',
    entity_id: created.user.id,
    details: { role: 'limited_admin', permission_keys: [...new Set(permissions)] },
  })
  finish('administrators', 'admin-created')
}

export async function setDelegatedAdminActive(formData: FormData) {
  const context = await requirePermission('admins')
  if (context.admin.role !== 'super_admin') redirect(adminUrl('', { error: 'forbidden' }))
  const userId = formData.get('userId')
  const activeValue = formData.get('active')
  if (typeof userId !== 'string' || !uuidPattern.test(userId) || userId === context.user.id || (activeValue !== 'true' && activeValue !== 'false')) redirect(adminUrl('', { view: 'administrators', error: 'admin-invalid' }))
  const service = createSupabaseServiceClient()
  const { data: target } = await service.from('admin_users').select('role').eq('user_id', userId).maybeSingle()
  if (!target || target.role !== 'limited_admin') redirect(adminUrl('', { view: 'administrators', error: 'admin-invalid' }))
  const active = activeValue === 'true'
  const { error } = await service.from('admin_users').update({ active }).eq('user_id', userId)
  if (error) redirect(adminUrl('', { view: 'administrators', error: 'admin-save' }))
  if (!active) await service.auth.admin.signOut(userId, 'global')
  await service.from('admin_audit_log').insert({
    actor_id: context.user.id,
    action: active ? 'activate' : 'deactivate',
    entity: 'admin_users',
    entity_id: userId,
    details: { active },
  })
  finish('administrators', 'admin-updated')
}

export async function deleteDelegatedAdmin(formData: FormData) {
  const context = await requirePermission('admins')
  if (context.admin.role !== 'super_admin') redirect(adminUrl('', { error: 'forbidden' }))
  const userId = formData.get('userId')
  if (typeof userId !== 'string' || !uuidPattern.test(userId) || userId === context.user.id) {
    redirect(adminUrl('', { view: 'administrators', error: 'admin-invalid' }))
  }

  const service = createSupabaseServiceClient()
  const { data: target } = await service
    .from('admin_users')
    .select('user_id, email, role, is_protected')
    .eq('user_id', userId)
    .maybeSingle()

  if (!target || target.is_protected || target.role === 'super_admin') {
    redirect(adminUrl('', { view: 'administrators', error: 'admin-protected-delete' }))
  }

  const { error: dbError } = await service.from('admin_users').delete().eq('user_id', userId)
  if (dbError) {
    console.error('[deleteDelegatedAdmin] database delete error:', dbError)
    redirect(adminUrl('', { view: 'administrators', error: 'admin-delete-failed' }))
  }

  try {
    await service.auth.admin.deleteUser(userId)
  } catch (authErr) {
    console.warn('[deleteDelegatedAdmin] auth delete user warning:', authErr)
  }

  await service.from('admin_audit_log').insert({
    actor_id: context.user.id,
    action: 'delete',
    entity: 'admin_users',
    entity_id: userId,
    details: { email: target.email, role: target.role },
  })

  finish('administrators', 'admin-deleted')
}

export async function deleteSpeakerApplication(formData: FormData) {
  const { supabase, user } = await requirePermission('speaker_applications')
  const id = formData.get('id')
  if (typeof id !== 'string' || !uuidPattern.test(id)) redirect(adminUrl('', { view: 'speaker-applications', error: 'speaker-invalid' }))
  const { data, error } = await supabase.from('cgs_inbox_messages')
    .delete()
    .eq('id', id)
    .eq('metadata->>source', 'speaker-application')
    .select('id')
    .maybeSingle()
  if (error || !data) redirect(adminUrl('', { view: 'speaker-applications', error: 'speaker-delete' }))

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'delete',
      entity: 'cgs_speaker_applications',
      entity_id: id,
      details: { id },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log speaker app deletion:', auditErr)
  }

  finish('speaker-applications', 'speaker-application-deleted')
}
