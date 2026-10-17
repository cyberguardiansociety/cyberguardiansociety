import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { cache } from 'react'
import { revalidatePath } from 'next/cache'
import { ADMIN_BASE_PATH } from '@/lib/admin-config'
import { onlineSessions, type OnlineSession } from '@/data/site'
import { isSupabaseRuntimeConfigured } from '@/lib/supabase/config'

export type StoredSession = {
  id: string
  title: string
  slug: string
  description: string
  full_description: string | null
  starts_at: string
  ends_at: string | null
  timezone: string
  platform: string
  href: string
  status: 'current' | 'upcoming'
  management_status: 'DRAFT' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED'
  is_active: boolean
  is_published: boolean
  registration_open: boolean
  attendance_open: boolean
  attendance_starts_at: string | null
  attendance_ends_at: string | null
  session_number: number | null
  bootcamp_tag: string
  sheet_connection_id: string | null
  speakerIds: string[]
  created_by?: string
  created_at: string
  updated_at: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const SESSIONS_FILE = path.join(DATA_DIR, 'managed-sessions.json')

function readLocalSessions(): StoredSession[] {
  if (!fs.existsSync(SESSIONS_FILE)) {
    return []
  }
  const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8')
  if (!raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Managed sessions payload is not an array.')
    return parsed as StoredSession[]
  } catch (err) {
    console.error('[sessions-store] Corrupt managed sessions file:', err)
    throw new Error(`Managed sessions storage file is corrupted: ${(err as Error).message}`)
  }
}

function writeLocalSessions(sessions: StoredSession[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    const tempFile = `${SESSIONS_FILE}.${process.pid}.${randomUUID()}.tmp`
    fs.writeFileSync(tempFile, JSON.stringify(sessions, null, 2), 'utf-8')
    try {
      fs.renameSync(tempFile, SESSIONS_FILE)
    } catch {
      fs.copyFileSync(tempFile, SESSIONS_FILE)
      try { fs.unlinkSync(tempFile) } catch {}
    }
  } catch (err) {
    console.error('[sessions-store] Failed to write local sessions:', err)
    throw new Error('Managed sessions could not be saved to storage.')
  }
}

function formatSchedule(startsAt: string) {
  const date = new Date(startsAt)
  return {
    date: new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(date),
    time: `${new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(date)} UTC`,
  }
}

function safeHref(href: string) {
  try {
    const internalOrigin = 'https://cgs.invalid'
    const url = new URL(href, internalOrigin)
    if (url.origin === internalOrigin) {
      return `${url.pathname}${url.search}${url.hash}`
    }
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '/contact'
  } catch {
    return '/contact'
  }
}

let publicSessionsCache: { data: StoredSession[]; timestamp: number } | null = null
let adminSessionsCache: { data: StoredSession[]; timestamp: number } | null = null

export function invalidateSessionsCache() {
  publicSessionsCache = null
  adminSessionsCache = null
}

/**
 * Load all managed sessions with bidirectional merge:
 * 1. Read local persistent JSON cache
 * 2. Query Supabase online_sessions (base columns that never fail)
 * 3. Merge seamlessly so nothing is ever lost
 */
export const getAllManagedSessions = cache(async function getAllManagedSessions(
  supabase?: any,
  isAdmin = false,
): Promise<StoredSession[]> {
  // Fast in-memory cache keyed by privilege (15s TTL)
  const cacheRef = isAdmin ? adminSessionsCache : publicSessionsCache
  if (cacheRef && Date.now() - cacheRef.timestamp < 15000) {
    return cacheRef.data
  }

  const hostedDatabase = isSupabaseRuntimeConfigured()
  if (hostedDatabase && !supabase) throw new Error('The Supabase session store is unavailable.')
  const localList = hostedDatabase ? [] : readLocalSessions()
  const sessionMap = new Map<string, StoredSession>()

  for (const s of localList) {
    sessionMap.set(s.id, s)
  }

  if (supabase) {
    try {
      const { data: dbRows, error: dbErr } = await supabase
        .from('online_sessions')
        .select('*')
        .order('starts_at', { ascending: false })

      if (dbErr) {
        console.warn('[sessions-store] Failed to load managed sessions:', dbErr.message || dbErr)
      } else {
        const { data: speakerRows, error: speakerError } = await supabase
          .from('cgs_session_speakers')
          .select('session_id, speaker_id')
        if (speakerError) {
          console.warn('[sessions-store] Failed to load session speakers:', speakerError.message || speakerError)
        }
        const speakersBySession = new Map<string, string[]>()
        for (const link of Array.isArray(speakerRows) ? speakerRows : []) {
          if (typeof link.session_id !== 'string' || typeof link.speaker_id !== 'string') continue
          const ids = speakersBySession.get(link.session_id) ?? []
          ids.push(link.speaker_id)
          speakersBySession.set(link.session_id, ids)
        }
        if (Array.isArray(dbRows)) {
          for (const row of dbRows) {
            const speakerIds = speakersBySession.get(row.id) ?? []
            const existing = sessionMap.get(row.id)
            if (existing) {
              sessionMap.set(row.id, { ...existing, ...row, speakerIds })
            } else {
              // New record found in Supabase
              const slug = (row.title || 'session')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
              sessionMap.set(row.id, {
                id: row.id,
                title: row.title || 'Untitled Session',
                slug: slug || `session-${row.id.slice(0, 8)}`,
                description: row.description || '',
                full_description: row.full_description ?? null,
                starts_at: row.starts_at || new Date().toISOString(),
                ends_at: row.ends_at ?? new Date(new Date(row.starts_at).getTime() + 3600000).toISOString(),
                timezone: row.timezone || 'Asia/Karachi',
                platform: row.platform || 'Google Meet',
                href: row.href || '/',
                status: row.status || 'upcoming',
                management_status: row.management_status || (row.status === 'current' ? 'LIVE' : 'UPCOMING'),
                is_active: row.is_active !== false,
                is_published: Boolean(row.is_published),
                registration_open: row.registration_open !== false,
                attendance_open: Boolean(row.attendance_open),
                attendance_starts_at: row.attendance_starts_at ?? null,
                attendance_ends_at: row.attendance_ends_at ?? null,
                session_number: row.session_number ?? null,
                bootcamp_tag: row.bootcamp_tag || 'cgs-bootcamp-2026',
                sheet_connection_id: row.sheet_connection_id ?? null,
                speakerIds,
                created_at: row.created_at || new Date().toISOString(),
                updated_at: row.updated_at || new Date().toISOString(),
              })
            }
          }
        }
      }
    } catch (e) {
      console.warn('[sessions-store] Failed to fetch remote Supabase sessions:', e)
    }
  }

  const merged = Array.from(sessionMap.values()).sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
  )

  // Cache in memory keyed by privilege
  if (isAdmin) {
    adminSessionsCache = { data: merged, timestamp: Date.now() }
  } else {
    publicSessionsCache = { data: merged, timestamp: Date.now() }
  }

  // Cache back to local file
  if (!hostedDatabase) writeLocalSessions(merged)
  return merged
})

/**
 * Save or update a session across Supabase and local store
 */
export async function saveManagedSession(
  sessionData: Partial<StoredSession> & { id?: string },
  userId: string,
  supabase?: any
): Promise<StoredSession> {
  invalidateSessionsCache()
  const now = new Date().toISOString()

  if (sessionData.id && !/^[0-9a-zA-Z_-]{1,64}$/.test(sessionData.id)) {
    throw new Error('Invalid session ID format.')
  }
  const id = sessionData.id || randomUUID()

  // Preserve original created_at and created_by across edits to protect audit trail
  let existingCreatedAt = sessionData.created_at
  let existingCreatedBy = sessionData.created_by
  if (sessionData.id) {
    if (supabase) {
      const { data: existingRow } = await supabase
        .from('online_sessions')
        .select('created_at, created_by')
        .eq('id', sessionData.id)
        .maybeSingle()
      if (existingRow) {
        existingCreatedAt = existingRow.created_at || existingCreatedAt
        existingCreatedBy = existingRow.created_by || existingCreatedBy
      }
    } else {
      const local = readLocalSessions().find((s) => s.id === sessionData.id)
      if (local) {
        existingCreatedAt = local.created_at || existingCreatedAt
        existingCreatedBy = local.created_by || existingCreatedBy
      }
    }
  }

  // Safe date parsing: reject invalid dates without throwing RangeError, ensure ends_at >= starts_at
  let validStartsAt: string
  try {
    const d = new Date(sessionData.starts_at || now)
    validStartsAt = isNaN(d.getTime()) ? now : d.toISOString()
  } catch {
    validStartsAt = now
  }

  let validEndsAt: string
  try {
    const candidateEnd = sessionData.ends_at
      ? new Date(sessionData.ends_at)
      : new Date(new Date(validStartsAt).getTime() + 3600000)
    if (isNaN(candidateEnd.getTime()) || candidateEnd.getTime() < new Date(validStartsAt).getTime()) {
      validEndsAt = new Date(new Date(validStartsAt).getTime() + 3600000).toISOString()
    } else {
      validEndsAt = candidateEnd.toISOString()
    }
  } catch {
    validEndsAt = new Date(new Date(validStartsAt).getTime() + 3600000).toISOString()
  }

  const timezone = sessionData.timezone || 'Asia/Karachi'
  const managementStatus = sessionData.management_status || 'UPCOMING'
  const isLive = managementStatus === 'LIVE'
  const title = (sessionData.title || 'Untitled Session').trim()
  const slug = (sessionData.slug || title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `session-${id.slice(0, 8)}`

  const record: StoredSession = {
    id,
    title,
    slug,
    description: sessionData.description || title,
    full_description: sessionData.full_description || null,
    starts_at: validStartsAt,
    ends_at: validEndsAt,
    timezone,
    platform: sessionData.platform || 'Google Meet',
    href: sessionData.href || '/',
    status: isLive ? 'current' : 'upcoming',
    management_status: managementStatus,
    is_active: sessionData.is_active !== false,
    is_published: Boolean(sessionData.is_published),
    registration_open: sessionData.registration_open !== false,
    attendance_open: Boolean(sessionData.attendance_open),
    attendance_starts_at: sessionData.attendance_starts_at || null,
    attendance_ends_at: sessionData.attendance_ends_at || null,
    session_number: typeof sessionData.session_number === 'number' && Number.isFinite(sessionData.session_number) ? sessionData.session_number : null,
    bootcamp_tag: sessionData.bootcamp_tag || 'cgs-bootcamp-2026',
    sheet_connection_id: sessionData.sheet_connection_id || null,
    speakerIds: Array.isArray(sessionData.speakerIds) ? sessionData.speakerIds : [],
    created_by: existingCreatedBy || userId,
    created_at: existingCreatedAt || now,
    updated_at: now,
  }

  const hostedDatabase = isSupabaseRuntimeConfigured()
  if (hostedDatabase && !supabase) throw new Error('The Supabase session store is unavailable.')
  if (supabase) {
    const { speakerIds, ...databaseRecord } = record
    const { error } = await supabase.from('online_sessions').upsert(databaseRecord, { onConflict: 'id' })
    if (error) throw new Error('Managed session could not be saved to the database.')

    // In hosted mode, synchronize the cgs_session_speakers link table
    await supabase.from('cgs_session_speakers').delete().eq('session_id', id)
    if (Array.isArray(speakerIds) && speakerIds.length > 0) {
      const links = speakerIds.map((speaker_id) => ({
        session_id: id,
        speaker_id,
      }))
      const { error: linkError } = await supabase.from('cgs_session_speakers').insert(links)
      if (linkError) {
        console.warn('[sessions-store] Failed to save session speakers link:', linkError.message || linkError)
      }
    }
  }
  if (!hostedDatabase) {
    const localList = readLocalSessions()
    const existingIdx = localList.findIndex((s) => s.id === id)
    if (existingIdx >= 0) localList[existingIdx] = { ...localList[existingIdx], ...record }
    else localList.unshift(record)
    writeLocalSessions(localList)
  }

  // 3. Revalidate paths
  try {
    revalidatePath('/')
    revalidatePath(ADMIN_BASE_PATH)
    revalidatePath('/admin')
    revalidatePath('/attendance')
    revalidatePath('/sessions')
  } catch {}

  return record
}

/**
 * Delete a session across local store and Supabase
 */
export async function deleteManagedSession(id: string, supabase?: any): Promise<boolean> {
  invalidateSessionsCache()
  const hostedDatabase = isSupabaseRuntimeConfigured()
  if (hostedDatabase && !supabase) throw new Error('The Supabase session store is unavailable.')
  if (supabase) {
    const { error } = await supabase.from('online_sessions').delete().eq('id', id)
    if (error) throw new Error('Managed session could not be deleted from the database.')
  }
  if (!hostedDatabase) {
    writeLocalSessions(readLocalSessions().filter((s) => s.id !== id))
  }

  try {
    revalidatePath('/')
    revalidatePath(ADMIN_BASE_PATH)
    revalidatePath('/admin')
    revalidatePath('/attendance')
    revalidatePath('/sessions')
  } catch {}

  return true
}

/**
 * Fetch published sessions for the public website
 */
export async function getPublicOnlineSessions(supabase?: any): Promise<{
  current: OnlineSession[]
  upcoming: OnlineSession[]
}> {
  const allSessions = await getAllManagedSessions(supabase, false)

  const published = allSessions.filter(
    (s) =>
      s.is_published &&
      s.is_active &&
      s.management_status !== 'DRAFT' &&
      s.management_status !== 'CANCELLED' &&
      s.management_status !== 'ARCHIVED'
  )

  const sessions: { current: OnlineSession[]; upcoming: OnlineSession[] } = {
    current: [],
    upcoming: [],
  }

  for (const record of published) {
    const isLive = record.management_status === 'LIVE' || record.status === 'current'
    const schedule = formatSchedule(record.starts_at)
    const targetKey = isLive ? 'current' : 'upcoming'

    sessions[targetKey].push({
      id: record.id,
      title: record.title,
      description: record.description,
      date: schedule.date,
      time: schedule.time,
      platform: record.platform,
      href: safeHref(record.href),
    })
  }

  // If there are no custom published sessions yet, fall back to default site data
  if (!sessions.current.length && !sessions.upcoming.length) {
    return onlineSessions
  }

  return sessions
}
