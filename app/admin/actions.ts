'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAdmin, requirePermission } from '@/lib/admin-auth'
import { readPrivateText, uploadPrivateObject, deletePrivateApplication } from '@/lib/supabase-storage'
import { adminUrl, ADMIN_BASE_PATH } from '@/lib/admin-config'
import { destroyAdminSession } from '@/lib/security/session'

const APPLICATION_DIRECTORY_PATTERN = /^applications\/\d{4}-\d{2}-\d{2}-\d{2}-\d{2}_(?:[a-f0-9]{6}|[a-f0-9]{32})$/
const APPLICATION_STATUSES = ['received', 'reviewing', 'accepted', 'declined'] as const

type SessionFields = {
  title: string
  description: string
  startsAt: string
  platform: string
  href: string
  status: 'current' | 'upcoming'
  isPublished: boolean
}

function parseSession(formData: FormData): SessionFields | null {
  const title = formData.get('title')
  const description = formData.get('description')
  const startsAtValue = formData.get('startsAt')
  const platform = formData.get('platform')
  const hrefValue = formData.get('href')
  const status = formData.get('status')

  if (
    typeof title !== 'string' ||
    typeof description !== 'string' ||
    typeof startsAtValue !== 'string' ||
    typeof platform !== 'string' ||
    typeof hrefValue !== 'string' ||
    (status !== 'current' && status !== 'upcoming')
  ) return null

  const cleanTitle = title.trim()
  const cleanDescription = description.trim()
  const cleanPlatform = platform.trim()
  const cleanHref = hrefValue.trim()
  if (
    cleanTitle.length < 3 || cleanTitle.length > 160 ||
    cleanDescription.length < 10 || cleanDescription.length > 1200 ||
    cleanPlatform.length < 2 || cleanPlatform.length > 80 ||
    cleanHref.length < 1 || cleanHref.length > 2048 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsAtValue)
  ) return null

  let safeHref: string
  try {
    const internalOrigin = 'https://cgs.invalid'
    const parsedHref = new URL(cleanHref, internalOrigin)
    if (parsedHref.origin === internalOrigin) {
      safeHref = `${parsedHref.pathname}${parsedHref.search}${parsedHref.hash}`
    } else {
      if (parsedHref.protocol !== 'https:' || parsedHref.username || parsedHref.password) return null
      safeHref = parsedHref.toString()
    }
  } catch {
    return null
  }

  return {
    title: cleanTitle,
    description: cleanDescription,
    startsAt: new Date(startsAtValue).toISOString(),
    platform: cleanPlatform,
    href: safeHref,
    status,
    isPublished: formData.get('isPublished') === 'on',
  }
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function refreshSessionViews() {
  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath(ADMIN_BASE_PATH)
}

export async function createSession(formData: FormData) {
  const { supabase, user } = await requirePermission('sessions')
  const session = parseSession(formData)
  if (!session) redirect(adminUrl('', { error: 'invalid' }))

  const { error } = await supabase.from('online_sessions').insert({
    title: session.title,
    description: session.description,
    starts_at: session.startsAt,
    platform: session.platform,
    href: session.href,
    status: session.status,
    is_published: session.isPublished,
    created_by: user.id,
  })

  if (error) redirect(adminUrl('', { error: 'save' }))
  refreshSessionViews()
  redirect(adminUrl('', { status: 'created' }))
}

export async function updateSession(formData: FormData) {
  const { supabase } = await requirePermission('sessions')
  const id = formData.get('id')
  const session = parseSession(formData)
  if (!validId(id) || !session) redirect(adminUrl('', { error: 'invalid' }))

  const { data, error } = await supabase
    .from('online_sessions')
    .update({
      title: session.title,
      description: session.description,
      starts_at: session.startsAt,
      platform: session.platform,
      href: session.href,
      status: session.status,
      is_published: session.isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error || !data) redirect(adminUrl('', { error: 'save' }))
  refreshSessionViews()
  redirect(adminUrl('', { status: 'saved' }))
}

export async function updateApplicationStatus(formData: FormData) {
  await requirePermission('applications')
  const directory = formData.get('directory')
  const status = formData.get('status')
  if (
    typeof directory !== 'string' ||
    !APPLICATION_DIRECTORY_PATTERN.test(directory) ||
    typeof status !== 'string' ||
    !APPLICATION_STATUSES.includes(status as (typeof APPLICATION_STATUSES)[number])
  ) redirect(adminUrl('', { view: 'applications', error: 'application-invalid' }))

  const path = `${directory}/application.json`
  const text = await readPrivateText(path)
  if (!text) redirect(adminUrl('', { view: 'applications', error: 'application-unavailable' }))

  let application: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid application')
    application = parsed as Record<string, unknown>
  } catch {
    redirect(adminUrl('', { view: 'applications', error: 'application-unavailable' }))
  }

  const result = await uploadPrivateObject({
    path,
    body: JSON.stringify({ ...application, status, reviewedAt: new Date().toISOString() }),
    contentType: 'application/json',
    upsert: true,
  })
  if (!result.ok) redirect(adminUrl('', { view: 'applications', error: 'application-save' }))

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      action: 'update_status',
      entity: 'join_applications',
      entity_id: directory,
      details: { status, reference: application.reference },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log application status update:', auditErr)
  }

  revalidatePath('/admin')
  revalidatePath(ADMIN_BASE_PATH)
  redirect(adminUrl('', { view: 'applications', status: 'application-updated' }))
}

export async function deleteApplication(formData: FormData) {
  await requirePermission('applications')
  const directory = formData.get('directory')
  if (
    typeof directory !== 'string' ||
    !APPLICATION_DIRECTORY_PATTERN.test(directory)
  ) redirect(adminUrl('', { view: 'applications', error: 'application-invalid' }))

  const ok = await deletePrivateApplication(directory)
  if (!ok) redirect(adminUrl('', { view: 'applications', error: 'application-delete' }))

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      action: 'delete',
      entity: 'join_applications',
      entity_id: directory,
      details: { directory },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log application deletion:', auditErr)
  }

  revalidatePath('/admin')
  revalidatePath(ADMIN_BASE_PATH)
  redirect(adminUrl('', { view: 'applications', status: 'application-deleted' }))
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut({ scope: 'local' })
  await destroyAdminSession()
  redirect('/')
}