import fs from 'fs'
import path from 'path'
import { cache } from 'react'
import { revalidatePath } from 'next/cache'
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
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return []
    }
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StoredSession[]) : []
  } catch (err) {
    console.warn('[sessions-store] Failed to read local sessions:', err)
    return []
  }
}

function writeLocalSessions(sessions: StoredSession[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8')
  } catch (err) {
    console.error('[sessions-store] Failed to write local sessions:', err)
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

let sessionsCache: { data: StoredSession[]; timestamp: number } | null = null

export function invalidateSessionsCache() {
  sessionsCache = null
}

/**
 * Load all managed sessions with bidirectional merge:
 * 1. Read local persistent JSON cache
 * 2. Query Supabase online_sessions (base columns that never fail)
 * 3. Merge seamlessly so nothing is ever lost
 */
export const getAllManagedSessions = cache(async function getAllManagedSessions(supabase?: any): Promise<StoredSession[]> {
  // Fast in-memory cache (15s TTL) for instant navigation & execution
  if (sessionsCache && Date.now() - sessionsCache.timestamp < 15000) {
    return sessionsCache.data
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

  // Cache in memory for instant subsequent reads
  sessionsCache = { data: merged, timestamp: Date.now() }

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
  const id = sessionData.id || crypto.randomUUID()

  const startsAt = sessionData.starts_at || now
  const endsAt = sessionData.ends_at || new Date(new Date(startsAt).getTime() + 3600000).toISOString()
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
    starts_at: startsAt,
    ends_at: endsAt,
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
    session_number: typeof sessionData.session_number === 'number' ? sessionData.session_number : null,
    bootcamp_tag: sessionData.bootcamp_tag || 'cgs-bootcamp-2026',
    sheet_connection_id: sessionData.sheet_connection_id || null,
    speakerIds: Array.isArray(sessionData.speakerIds) ? sessionData.speakerIds : [],
    created_by: userId,
    created_at: sessionData.created_at || now,
    updated_at: now,
  }

  const hostedDatabase = isSupabaseRuntimeConfigured()
  if (hostedDatabase && !supabase) throw new Error('The Supabase session store is unavailable.')
  if (supabase) {
    const { speakerIds, ...databaseRecord } = record
    const { error } = await supabase.from('online_sessions').upsert(databaseRecord, { onConflict: 'id' })
    if (error) throw new Error('Managed session could not be saved to the database.')
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
    revalidatePath('/admin')
    revalidatePath('/attendance')
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
    revalidatePath('/admin')
    revalidatePath('/attendance')
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
  const allSessions = await getAllManagedSessions(supabase)

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
