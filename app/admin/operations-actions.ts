'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { hasAdminPermission, requireAdmin, requirePermission } from '@/lib/admin-auth'
import { parseZonedLocalInput } from '@/lib/timezone'
import { syncGoogleConnection } from '@/lib/google-sheets'
import { adminUrl } from '@/lib/admin-config'

const SESSION_STATUSES = ['DRAFT', 'UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as const
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function textField(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name)
  if (typeof value !== 'string') return null
  const clean = value.trim()
  return clean.length <= maxLength ? clean : null
}

function safeUrl(value: string) {
  if (!value) return ''
  try {
    const url = new URL(value, 'https://cgs.invalid')
    if (url.origin === 'https://cgs.invalid') return `${url.pathname}${url.search}${url.hash}`
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null
  } catch {
    return null
  }
}

function refreshPortal() {
  revalidatePath('/')
  revalidatePath('/admin')
}

function fail(view: string, code: string): never {
  redirect(adminUrl('', { view, error: code }))
}

function done(view: string, status: string): never {
  refreshPortal()
  redirect(adminUrl('', { view, status }))
}

async function replaceSessionSpeakers(
  supabase: any,
  sessionId: string,
  speakerIds: string[],
) {
  try {
    await supabase.from('cgs_session_speakers').delete().eq('session_id', sessionId)
    for (const speakerId of speakerIds) {
      if (speakerId) {
        await supabase.from('cgs_session_speakers').insert({
          session_id: sessionId,
          speaker_id: speakerId,
          sort_order: 0,
        })
      }
    }
  } catch (err) {
    console.warn('[sessions] Failed to sync session speakers:', err)
  }
  return true
}

function parseSession(formData: FormData) {
  const title = textField(formData, 'title', 160)
  const slugInput = textField(formData, 'slug', 200)
  const description = textField(formData, 'description', 5000) || title
  const fullDescription = textField(formData, 'fullDescription', 10000)
  const timezone = textField(formData, 'timezone', 80) || 'Asia/Karachi'
  const startsAtValue = textField(formData, 'startsAt', 32)
  const endsAtValue = textField(formData, 'endsAt', 32)
  const meetLinkValue = textField(formData, 'meetLink', 2048) || ''
  const rawStatus = textField(formData, 'managementStatus', 20) || 'UPCOMING'
  const statusValue = (SESSION_STATUSES.includes(rawStatus as (typeof SESSION_STATUSES)[number]) ? rawStatus : null) as (typeof SESSION_STATUSES)[number] | null
  const sessionNumberValue = textField(formData, 'sessionNumber', 8) || ''
  const bootcampTag = textField(formData, 'bootcampTag', 160) || 'cgs-bootcamp-2026'
  const connectionValue = textField(formData, 'sheetConnectionId', 36) || ''
  const speakerIds = formData.getAll('speakerIds').filter((value): value is string => typeof value === 'string')

  if (
    !title || title.length < 3 ||
    !startsAtValue ||
    !statusValue ||
    (sessionNumberValue && (!/^\d+$/.test(sessionNumberValue) || Number(sessionNumberValue) < 1 || Number(sessionNumberValue) > 999)) ||
    speakerIds.length > 40 || speakerIds.some((id) => !SESSION_ID_PATTERN.test(id)) ||
    (connectionValue && !SESSION_ID_PATTERN.test(connectionValue))
  ) return null

  const startsAt = parseZonedLocalInput(startsAtValue, timezone)
  if (!startsAt) return null

  let endsAt = endsAtValue ? parseZonedLocalInput(endsAtValue, timezone) : null
  if (!endsAt || endsAt <= startsAt) {
    endsAt = new Date(startsAt.getTime() + 3600000)
  }

  const href = safeUrl(meetLinkValue)
  if (href === null) return null

  const slugBase = (slugInput || title).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!slugBase || slugBase.length > 200) return null

  return {
    title,
    slug: slugBase,
    description: description || title,
    full_description: fullDescription || null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    timezone,
    platform: 'Google Meet',
    href: href || '/',
    status: (statusValue === 'LIVE' ? 'current' : 'upcoming') as 'current' | 'upcoming',
    management_status: statusValue,
    is_published: formData.get('isPublished') === 'on',
    is_active: formData.get('isActive') !== 'off',
    registration_open: formData.get('registrationOpen') === 'on',
    attendance_open: formData.get('attendanceOpen') === 'on',
    session_number: sessionNumberValue ? Number(sessionNumberValue) : null,
    bootcamp_tag: bootcampTag,
    sheet_connection_id: connectionValue || null,
    speakerIds,
  }
}

export async function createManagedSession(formData: FormData) {
  const { supabase, user } = await requirePermission('sessions')
  const session = parseSession(formData)
  if (!session) fail('sessions', 'invalid')
  const { speakerIds, ...record } = session

  const { saveManagedSession } = await import('@/lib/sessions-store')
  const savedSession = await saveManagedSession(
    {
      ...record,
      speakerIds,
    },
    user.id,
    supabase
  )

  if (speakerIds.length) {
    try {
      await replaceSessionSpeakers(supabase, savedSession.id, speakerIds)
    } catch {}
  }

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'create',
      entity: 'online_sessions',
      entity_id: savedSession.id,
      details: { title: record.title, status: record.management_status, starts_at: record.starts_at },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log session create:', auditErr)
  }

  done('sessions', 'session-created')
}

export async function updateManagedSession(formData: FormData) {
  const { supabase, user } = await requirePermission('sessions')
  const id = textField(formData, 'id', 36)
  const session = parseSession(formData)
  if (!id || !SESSION_ID_PATTERN.test(id) || !session) fail('sessions', 'invalid')
  const { speakerIds, ...record } = session

  const { saveManagedSession } = await import('@/lib/sessions-store')
  await saveManagedSession(
    {
      ...record,
      id,
      speakerIds,
    },
    user.id,
    supabase
  )

  if (speakerIds.length) {
    try {
      await replaceSessionSpeakers(supabase, id, speakerIds)
    } catch {}
  }

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'update',
      entity: 'online_sessions',
      entity_id: id,
      details: { title: record.title, status: record.management_status, starts_at: record.starts_at },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log session update:', auditErr)
  }

  done('sessions', 'session-saved')
}

export async function deleteManagedSession(formData: FormData) {
  const { supabase, user } = await requirePermission('sessions')
  const id = formData.get('id')
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id)) fail('sessions', 'invalid')

  const { deleteManagedSession: deleteSessionFromStore } = await import('@/lib/sessions-store')
  await deleteSessionFromStore(id, supabase)

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'delete',
      entity: 'online_sessions',
      entity_id: id,
      details: { id },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log session deletion:', auditErr)
  }

  done('sessions', 'session-deleted')
}

export async function updateManagedTiming(formData: FormData) {
  const { supabase, user } = await requirePermission('sessions')
  const id = formData.get('id')
  const timezone = textField(formData, 'timezone', 80) || 'Asia/Karachi'
  const startsAt = parseZonedLocalInput(textField(formData, 'startsAt', 32), timezone)
  const endsAt = parseZonedLocalInput(textField(formData, 'endsAt', 32), timezone)
  const mode = textField(formData, 'attendanceMode', 20)
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id) || !startsAt || !endsAt || endsAt <= startsAt) fail('time-management', 'invalid-time')

  const { getAllManagedSessions, saveManagedSession } = await import('@/lib/sessions-store')
  const allSessions = await getAllManagedSessions(supabase)
  const existing = allSessions.find((s) => s.id === id)
  if (!existing) fail('time-management', 'not-found')

  let attendanceStartsAt: string | null = null
  let attendanceEndsAt: string | null = null
  let attendanceOpen = formData.get('attendanceOpen') === 'on'
  if (mode === 'session') {
    attendanceStartsAt = startsAt.toISOString()
    attendanceEndsAt = endsAt.toISOString()
  } else if (mode === 'custom') {
    const customStart = parseZonedLocalInput(textField(formData, 'attendanceStartsAt', 32), timezone)
    const customEnd = parseZonedLocalInput(textField(formData, 'attendanceEndsAt', 32), timezone)
    if (!customStart || !customEnd || customEnd <= customStart) fail('time-management', 'invalid-window')
    attendanceStartsAt = customStart.toISOString()
    attendanceEndsAt = customEnd.toISOString()
  } else if (mode !== 'open' && mode !== 'closed') {
    fail('time-management', 'invalid-window')
  }
  if (mode === 'open') attendanceOpen = true
  if (mode === 'closed') attendanceOpen = false

  const statusValue = textField(formData, 'managementStatus', 20) || existing.management_status
  if (!SESSION_STATUSES.includes(statusValue as (typeof SESSION_STATUSES)[number])) fail('time-management', 'invalid-status')

  await saveManagedSession(
    {
      ...existing,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      timezone,
      attendance_starts_at: attendanceStartsAt,
      attendance_ends_at: attendanceEndsAt,
      attendance_open: attendanceOpen,
      registration_open: formData.get('registrationOpen') === 'on',
      management_status: statusValue as any,
      status: statusValue === 'LIVE' ? 'current' : 'upcoming',
    },
    user.id,
    supabase
  )

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'update_timing',
      entity: 'online_sessions',
      entity_id: id,
      details: { management_status: statusValue, attendance_open: attendanceOpen },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log timing update:', auditErr)
  }

  done('time-management', 'timing-saved')
}

export async function quickStartManagedSession(formData: FormData) {
  const { supabase, user } = await requirePermission('sessions')
  const id = formData.get('id')
  const duration = Number(formData.get('durationMinutes') ?? 60)
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id) || !Number.isInteger(duration) || duration < 5 || duration > 720) fail('time-management', 'invalid-duration')
  const now = new Date()
  const endsAt = new Date(now.getTime() + duration * 60_000)

  const { getAllManagedSessions, saveManagedSession } = await import('@/lib/sessions-store')
  const allSessions = await getAllManagedSessions(supabase)
  const existing = allSessions.find((s) => s.id === id)
  if (!existing) fail('time-management', 'not-found')

  await saveManagedSession(
    {
      ...existing,
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      management_status: 'LIVE',
      status: 'current',
      is_active: true,
      attendance_open: true,
      attendance_starts_at: now.toISOString(),
      attendance_ends_at: endsAt.toISOString(),
    },
    user.id,
    supabase
  )

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'quick_start',
      entity: 'online_sessions',
      entity_id: id,
      details: { durationMinutes: duration },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log quick start:', auditErr)
  }

  done('time-management', 'session-started')
}

export async function extendManagedSession(formData: FormData) {
  const { supabase, user } = await requirePermission('sessions')
  const id = formData.get('id')
  const minutes = Number(formData.get('minutes'))
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id) || !Number.isInteger(minutes) || minutes < 1 || minutes > 480) fail('time-management', 'invalid-duration')

  const { getAllManagedSessions, saveManagedSession } = await import('@/lib/sessions-store')
  const allSessions = await getAllManagedSessions(supabase)
  const session = allSessions.find((s) => s.id === id)
  if (!session) fail('time-management', 'not-found')

  const base = session.ends_at ? Math.max(Date.now(), new Date(session.ends_at).getTime()) : Date.now()
  const endsAt = new Date(base + minutes * 60_000).toISOString()
  let attendanceEndsAt = session.attendance_ends_at
  if (session.attendance_open) {
    const currentAttendanceEnd = attendanceEndsAt ? new Date(attendanceEndsAt).getTime() : base
    attendanceEndsAt = new Date(Math.max(Date.now(), currentAttendanceEnd) + minutes * 60_000).toISOString()
  }

  await saveManagedSession(
    {
      ...session,
      ends_at: endsAt,
      attendance_ends_at: attendanceEndsAt,
    },
    user.id,
    supabase
  )

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'extend_session',
      entity: 'online_sessions',
      entity_id: id,
      details: { minutesExtended: minutes },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log session extension:', auditErr)
  }

  done('time-management', 'session-extended')
}

export async function createSpeaker(formData: FormData) {
  const { supabase, user } = await requirePermission('speakers')
  const name = textField(formData, 'name', 200)
  const title = textField(formData, 'title', 200)
  const organization = textField(formData, 'organization', 200)
  const bio = textField(formData, 'bio', 5000)
  const email = textField(formData, 'email', 254)
  const photoUrl = safeUrl(textField(formData, 'photoUrl', 2048) || '')
  const linkedinUrl = safeUrl(textField(formData, 'linkedinUrl', 2048) || '')
  if (!name || !name.length || bio === null || email === null || photoUrl === null || linkedinUrl === null) fail('speakers', 'invalid')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('speakers', 'invalid')
  const socialLinks = {
    website: safeUrl(textField(formData, 'website', 2048) || ''),
  }
  if (socialLinks.website === null) fail('speakers', 'invalid')
  const { data: newSpeaker, error } = await supabase.from('cgs_speakers').insert({
    name, title: title || null, organization: organization || null, bio: bio || null,
    email: email || null, photo_url: photoUrl || null, linkedin_url: linkedinUrl || null,
    social_links: socialLinks,
  }).select('id').maybeSingle()
  if (error) fail('speakers', 'save')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'create',
      entity: 'cgs_speakers',
      entity_id: newSpeaker?.id,
      details: { name, title, organization },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log speaker creation:', auditErr)
  }

  done('speakers', 'speaker-created')
}

export async function updateSpeaker(formData: FormData) {
  const { supabase, user } = await requirePermission('speakers')
  const id = formData.get('id')
  const name = textField(formData, 'name', 200)
  const title = textField(formData, 'title', 200)
  const organization = textField(formData, 'organization', 200)
  const bio = textField(formData, 'bio', 5000)
  const email = textField(formData, 'email', 254)
  const photoUrl = safeUrl(textField(formData, 'photoUrl', 2048) || '')
  const linkedinUrl = safeUrl(textField(formData, 'linkedinUrl', 2048) || '')
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id) || !name || bio === null || email === null || photoUrl === null || linkedinUrl === null) fail('speakers', 'invalid')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('speakers', 'invalid')
  const { error } = await supabase.from('cgs_speakers').update({
    name, title: title || null, organization: organization || null, bio: bio || null,
    email: email || null, photo_url: photoUrl || null, linkedin_url: linkedinUrl || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) fail('speakers', 'save')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'update',
      entity: 'cgs_speakers',
      entity_id: id,
      details: { name, title, organization },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log speaker update:', auditErr)
  }

  done('speakers', 'speaker-saved')
}

export async function setSpeakerActive(formData: FormData) {
  const { supabase, user } = await requirePermission('speakers')
  const id = formData.get('id')
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id)) fail('speakers', 'invalid')
  const isActive = formData.get('isActive') === 'true'
  const { error } = await supabase.from('cgs_speakers').update({
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) fail('speakers', 'save')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'set_active',
      entity: 'cgs_speakers',
      entity_id: id,
      details: { is_active: isActive },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log speaker status change:', auditErr)
  }

  done('speakers', 'speaker-saved')
}

export async function deleteSpeaker(formData: FormData) {
  const { supabase, user } = await requirePermission('speakers')
  const id = formData.get('id')
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id)) fail('speakers', 'invalid')
  const { error } = await supabase.from('cgs_speakers').delete().eq('id', id)
  if (error) fail('speakers', 'delete')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'delete',
      entity: 'cgs_speakers',
      entity_id: id,
      details: { id },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log speaker deletion:', auditErr)
  }

  done('speakers', 'speaker-deleted')
}

export async function markAttendanceOverride(formData: FormData) {
  const { supabase, user } = await requirePermission('sessions')
  const sessionId = formData.get('sessionId')
  const emailValue = textField(formData, 'email', 254)
  const reason = textField(formData, 'reason', 1000)
  const email = emailValue?.toLowerCase().trim() || ''
  if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId) || !emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !reason || reason.length < 10) fail('attendance', 'invalid-override')
  
  // 1. Look up the normalized email exactly; wildcard characters must not
  // match a different registrant.
  let { data: registrant } = await supabase.from('cgs_registrants').select('id, name').eq('email', email).maybeSingle()
  
  // If registrant does not exist yet, provision them so attendance is matched to a valid registrant record
  if (!registrant) {
    const rawName = email.split('@')[0].replace(/[._-]/g, ' ')
    const defaultName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
    const { data: newReg, error: createError } = await supabase
      .from('cgs_registrants')
      .insert({
        email,
        name: defaultName,
      })
      .select('id, name')
      .single()

    if (createError || !newReg) fail('attendance', 'registrant-not-found')
    registrant = newReg
  }

  // 2. Ensure session registration exists
  const { data: registration } = await supabase
    .from('cgs_session_registrations')
    .select('id')
    .eq('session_id', sessionId)
    .eq('registrant_id', registrant.id)
    .maybeSingle()

  if (!registration) {
    await supabase.from('cgs_session_registrations').insert({
      session_id: sessionId,
      registrant_id: registrant.id,
    })
  }

  // 3. Record attendance
  const { error } = await supabase.from('cgs_attendance_records').insert({
    session_id: sessionId,
    registrant_id: registrant.id,
    method: 'manual-override',
    override_reason: reason,
  })
  if (error?.code === '23505') fail('attendance', 'already-marked')
  if (error) fail('attendance', 'save')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'manual_override',
      entity: 'cgs_attendance_records',
      entity_id: sessionId,
      details: { registrantEmail: email, registrantName: registrant.name, reason },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log attendance override:', auditErr)
  }

  done('attendance', 'attendance-marked')
}

export async function removeManualAttendance(formData: FormData) {
  const { supabase, user } = await requirePermission('sessions')
  const id = formData.get('id')
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id)) fail('attendance', 'invalid')
  const { error } = await supabase.from('cgs_attendance_records').delete().eq('id', id).eq('method', 'manual-override')
  if (error) fail('attendance', 'delete')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'remove_override',
      entity: 'cgs_attendance_records',
      entity_id: id,
      details: { id },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log attendance override removal:', auditErr)
  }

  done('attendance', 'attendance-removed')
}

export async function deleteRegistrant(formData: FormData) {
  const { supabase, user } = await requirePermission('sessions')
  const id = formData.get('id')
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id)) fail('registrants', 'invalid')
  const { error } = await supabase.from('cgs_registrants').delete().eq('id', id)
  if (error) fail('registrants', 'delete')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'delete',
      entity: 'cgs_registrants',
      entity_id: id,
      details: { id },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log registrant deletion:', auditErr)
  }

  done('registrants', 'registrant-deleted')
}

export async function updateInboxMessageStatus(formData: FormData) {
  const context = await requireAdmin()
  const id = formData.get('id')
  const status = formData.get('status')
  if (
    typeof id !== 'string' || !SESSION_ID_PATTERN.test(id) ||
    typeof status !== 'string' || !['new', 'in_progress', 'closed'].includes(status)
  ) fail('inbox', 'invalid')
  const { data: message } = await context.supabase.from('cgs_inbox_messages')
    .select('id, metadata')
    .eq('id', id)
    .maybeSingle()
  const isSpeakerApplication = message?.metadata?.source === 'speaker-application'
  const allowed = hasAdminPermission(context.admin, 'inbox') ||
    (isSpeakerApplication && hasAdminPermission(context.admin, 'speaker_applications'))
  if (!allowed) fail('inbox', 'forbidden')
  const { error } = await context.supabase.from('cgs_inbox_messages').update({
    status,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) fail('inbox', 'inbox-save')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: context.user.id,
      action: 'update_status',
      entity: 'cgs_inbox_messages',
      entity_id: id,
      details: { status, isSpeakerApplication },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log inbox update:', auditErr)
  }

  done('inbox', 'inbox-updated')
}

export async function deleteInboxMessage(formData: FormData) {
  const context = await requireAdmin()
  const id = formData.get('id')
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id)) fail('inbox', 'invalid')
  const { data: message } = await context.supabase.from('cgs_inbox_messages')
    .select('id, metadata')
    .eq('id', id)
    .maybeSingle()
  if (!message) fail('inbox', 'not-found')
  const isSpeakerApplication = message?.metadata?.source === 'speaker-application'
  const allowed = hasAdminPermission(context.admin, 'inbox') ||
    (isSpeakerApplication && hasAdminPermission(context.admin, 'speaker_applications'))
  if (!allowed) fail('inbox', 'forbidden')
  const { error } = await context.supabase.from('cgs_inbox_messages').delete().eq('id', id)
  if (error) fail('inbox', 'inbox-delete')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: context.user.id,
      action: 'delete',
      entity: 'cgs_inbox_messages',
      entity_id: id,
      details: { id, isSpeakerApplication },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log inbox delete:', auditErr)
  }

  done('inbox', 'inbox-deleted')
}

export async function clearClosedInboxMessages() {
  const context = await requireAdmin()
  if (!hasAdminPermission(context.admin, 'inbox')) fail('inbox', 'forbidden')
  const { error } = await context.supabase.from('cgs_inbox_messages').delete().eq('status', 'closed')
  if (error) fail('inbox', 'inbox-delete')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: context.user.id,
      action: 'clear_closed',
      entity: 'cgs_inbox_messages',
      entity_id: 'all_closed_messages',
      details: {},
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log inbox clear:', auditErr)
  }

  done('inbox', 'inbox-cleared')
}

function parseGoogleConnection(formData: FormData) {
  const name = textField(formData, 'name', 160)
  const spreadsheetId = textField(formData, 'spreadsheetId', 200)
  const sheetName = textField(formData, 'sheetName', 300)
  if (!name || !spreadsheetId || !sheetName || !/^[a-zA-Z0-9_-]{10,200}$/.test(spreadsheetId)) return null
  return { name, spreadsheet_id: spreadsheetId, sheet_name: sheetName }
}

export async function createGoogleConnection(formData: FormData) {
  const { supabase, user } = await requirePermission('google_sync')
  const connection = parseGoogleConnection(formData)
  if (!connection) fail('google-sync', 'invalid-connection')
  const { data: newConn, error } = await supabase.from('cgs_google_sheet_connections').insert(connection).select('id').maybeSingle()
  if (error) fail('google-sync', 'connection-save')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'create',
      entity: 'cgs_google_sheet_connections',
      entity_id: newConn?.id,
      details: { name: connection.name, spreadsheet_id: connection.spreadsheet_id, sheet_name: connection.sheet_name },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log google sync creation:', auditErr)
  }

  done('google-sync', 'connection-created')
}

export async function updateGoogleConnection(formData: FormData) {
  const { supabase, user } = await requirePermission('google_sync')
  const id = formData.get('id')
  const connection = parseGoogleConnection(formData)
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id) || !connection) fail('google-sync', 'invalid-connection')
  const { error } = await supabase.from('cgs_google_sheet_connections').update({
    ...connection,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) fail('google-sync', 'connection-save')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'update',
      entity: 'cgs_google_sheet_connections',
      entity_id: id,
      details: { name: connection.name, spreadsheet_id: connection.spreadsheet_id, sheet_name: connection.sheet_name },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log google sync update:', auditErr)
  }

  done('google-sync', 'connection-saved')
}

export async function setGoogleConnectionActive(formData: FormData) {
  const { supabase, user } = await requirePermission('google_sync')
  const id = formData.get('id')
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id)) fail('google-sync', 'invalid-connection')
  const isActive = formData.get('isActive') === 'true'
  const { error } = await supabase.from('cgs_google_sheet_connections').update({
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) fail('google-sync', 'connection-save')

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'set_active',
      entity: 'cgs_google_sheet_connections',
      entity_id: id,
      details: { is_active: isActive },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log google sync status:', auditErr)
  }

  done('google-sync', 'connection-saved')
}

export async function syncGoogleConnectionNow(formData: FormData) {
  const { supabase, user } = await requirePermission('google_sync')
  const id = formData.get('id')
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id)) fail('google-sync', 'invalid-connection')
  try {
    await syncGoogleConnection(supabase, id)
  } catch {
    fail('google-sync', 'sync-failed')
  }

  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      actor_id: user.id,
      action: 'sync_now',
      entity: 'cgs_google_sheet_connections',
      entity_id: id,
      details: { id },
    })
  } catch (auditErr) {
    console.warn('[Audit Log] Failed to log google sync execution:', auditErr)
  }

  done('google-sync', 'sync-complete')
}
