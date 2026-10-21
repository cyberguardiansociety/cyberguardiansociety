import fs from 'fs'
import path from 'path'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export type ParticipantCertificate = {
  id: string
  name: string
  email: string
  ref_id: string
  status: string
  time: string
  sessionTitle: string
  hasImage: boolean
  imagePath?: string
  source: 'json' | 'database'
}

type JsonCertificateEntry = {
  name: string
  ref_id: string
  status: string
  time: string
}

const JSON_FILE_PATH = path.join(process.cwd(), 'certificate_status.json')
const CERTIFICATES_DIR = path.join(process.cwd(), 'generated_certificates')

let memoryJsonCache: { data: Record<string, JsonCertificateEntry>; mtimeMs: number } | null = null

function readJsonCertificates(): Record<string, JsonCertificateEntry> {
  try {
    if (!fs.existsSync(JSON_FILE_PATH)) return {}
    const stat = fs.statSync(JSON_FILE_PATH)
    if (memoryJsonCache && memoryJsonCache.mtimeMs >= stat.mtimeMs) {
      return memoryJsonCache.data
    }
    const raw = fs.readFileSync(JSON_FILE_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, JsonCertificateEntry>
    memoryJsonCache = { data: parsed, mtimeMs: stat.mtimeMs }
    return parsed
  } catch (err) {
    console.error('[certificates-store] Error reading certificate_status.json:', err)
    return memoryJsonCache?.data ?? {}
  }
}

/**
 * Intelligent normalization of reference ID inputs.
 * Strips whitespace, normalizes casing, and handles with or without "CGS-" prefix.
 */
export function normalizeReferenceId(input: string): { original: string; normalized: string; candidateIds: string[] } {
  const original = (input || '').trim()
  if (!original) return { original: '', normalized: '', candidateIds: [] }

  const upper = original.toUpperCase().replace(/\s+/g, '')
  const candidates: string[] = [upper]

  if (!upper.startsWith('CGS-')) {
    candidates.push(`CGS-${upper}`)
  } else {
    // If it starts with CGS-, also add the raw code after CGS-
    candidates.push(upper.replace(/^CGS-/, ''))
  }

  return {
    original,
    normalized: upper.startsWith('CGS-') ? upper : `CGS-${upper}`,
    candidateIds: Array.from(new Set(candidates)),
  }
}

/**
 * Checks whether the physical PNG certificate exists on disk.
 */
export function getCertificateImagePath(refId: string): string | null {
  const sanitized = refId.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
  const filename = `${sanitized}.png`
  const fullPath = path.join(CERTIFICATES_DIR, filename)

  if (fs.existsSync(fullPath)) {
    return fullPath
  }
  return null
}

/**
 * Highly accurate and intelligent certificate finder.
 * 1. Checks certificate_status.json by reference ID (exact or normalized) and email.
 * 2. Checks database cgs_attendance_records.
 * 3. Verifies PNG file existence in generated_certificates.
 */
export async function lookupCertificate(rawCode: string): Promise<ParticipantCertificate | null> {
  const { original, normalized, candidateIds } = normalizeReferenceId(rawCode)
  if (!original) return null

  // 1. Check certificate_status.json
  const jsonRecords = readJsonCertificates()

  for (const [email, entry] of Object.entries(jsonRecords)) {
    const entryRef = (entry.ref_id || '').trim().toUpperCase()
    const matchesRef = candidateIds.some((cid) => cid === entryRef || cid === entryRef.replace(/^CGS-/, ''))
    const matchesEmail = original.toLowerCase() === email.toLowerCase()

    if (matchesRef || matchesEmail) {
      const hasImg = Boolean(getCertificateImagePath(entryRef))
      return {
        id: entryRef,
        ref_id: entryRef,
        name: entry.name || 'Participant',
        email,
        status: entry.status || 'verified',
        time: entry.time || new Date().toISOString(),
        sessionTitle: 'Cyber Guardian Society Cybersecurity Hands-on Session',
        hasImage: hasImg,
        imagePath: hasImg ? `/api/certificates/image?ref=${encodeURIComponent(entryRef)}` : undefined,
        source: 'json',
      }
    }
  }

  // 2. Check Database (cgs_attendance_records) as secondary source
  try {
    const supabase = createSupabaseServiceClient()
    // Test both UUID without prefix or formatted code
    const uuidCandidate = normalized.replace(/^CGS-/, '').toLowerCase()

    let attendanceRecord: any = null
    const { data: recById } = await supabase
      .from('cgs_attendance_records')
      .select('id, registrant_id, session_id, marked_at')
      .eq('id', uuidCandidate)
      .maybeSingle()

    if (recById) {
      attendanceRecord = recById
    }

    if (attendanceRecord) {
      const [{ data: registrant }, { data: session }] = await Promise.all([
        supabase.from('cgs_registrants').select('name, email').eq('id', attendanceRecord.registrant_id).maybeSingle(),
        supabase.from('online_sessions').select('title').eq('id', attendanceRecord.session_id).maybeSingle(),
      ])

      const certId = `CGS-${attendanceRecord.id.toUpperCase()}`
      const hasImg = Boolean(getCertificateImagePath(certId))

      return {
        id: certId,
        ref_id: certId,
        name: registrant?.name || 'CGS Participant',
        email: registrant?.email || '',
        status: 'verified',
        time: attendanceRecord.marked_at || new Date().toISOString(),
        sessionTitle: session?.title || 'Cyber Guardian Society Session',
        hasImage: hasImg,
        imagePath: hasImg ? `/api/certificates/image?ref=${encodeURIComponent(certId)}` : undefined,
        source: 'database',
      }
    }
  } catch (err) {
    // Database lookup failed, fall through to null
    console.warn('[certificates-store] Database lookup error:', err)
  }

  return null
}

/**
 * Returns all participants in certificate_status.json
 */
export function getAllJsonCertificates(): ParticipantCertificate[] {
  const jsonRecords = readJsonCertificates()
  return Object.entries(jsonRecords).map(([email, entry]) => {
    const ref = (entry.ref_id || '').trim().toUpperCase()
    const hasImg = Boolean(getCertificateImagePath(ref))
    return {
      id: ref,
      ref_id: ref,
      name: entry.name || 'Participant',
      email,
      status: entry.status || 'sent',
      time: entry.time || new Date().toISOString(),
      sessionTitle: 'Cyber Guardian Society Cybersecurity Hands-on Session',
      hasImage: hasImg,
      imagePath: hasImg ? `/api/certificates/image?ref=${encodeURIComponent(ref)}` : undefined,
      source: 'json' as const,
    }
  })
}
