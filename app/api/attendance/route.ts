import { NextResponse } from 'next/server'
import { hasSameOrigin, readJsonBody } from '@/lib/api-security'
import { checkRateLimit, RATE_LIMIT_POLICIES } from '@/lib/security/public-rate-limiter'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 4 * 1024
const TWO_HOURS = 2 * 60 * 60 * 1000

function fail(message: string, status: number, code: string) {
  return NextResponse.json({ success: false, message, code }, { status })
}

function certificateNumber(id: string) {
  return `CGS-${id.toUpperCase()}`
}

function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const an = a.length
  const bn = b.length
  if (an === 0) return bn
  if (bn === 0) return an
  const matrix: number[][] = []
  for (let i = 0; i <= bn; ++i) matrix[i] = [i]
  for (let j = 0; j <= an; ++j) matrix[0][j] = j
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        )
      }
    }
  }
  return matrix[bn][an]
}

function verifyNameMatch(inputName: string, registeredName: string | null | undefined): boolean {
  if (!registeredName || !registeredName.trim()) return true
  const normInput = normalizeName(inputName)
  const normRegistered = normalizeName(registeredName)

  // 1. Exact normalized match
  if (normInput === normRegistered) return true

  // 2. Token / word comparison
  const inputWords = normInput.split(' ').filter(Boolean)
  const registeredWords = normRegistered.split(' ').filter(Boolean)
  if (inputWords.length === 0 || registeredWords.length === 0) return false

  // All input words appear in registered words (e.g. "Shanyan Ahmed" in "Syed Shanyan Ahmed")
  const allInputInRegistered = inputWords.every((word) =>
    registeredWords.some((rWord) => rWord === word || (rWord.length > 3 && (rWord.startsWith(word) || word.startsWith(rWord))))
  )
  if (allInputInRegistered) return true

  // All registered words appear in input words (e.g. "Shanyan" in "Shanyan Ahmed")
  const allRegisteredInInput = registeredWords.every((word) =>
    inputWords.some((iWord) => iWord === word || (iWord.length > 3 && (iWord.startsWith(word) || word.startsWith(iWord))))
  )
  if (allRegisteredInInput) return true

  // Overlapping word count (at least 2 matching words)
  const matchingWords = inputWords.filter((iWord) =>
    registeredWords.some((rWord) => rWord === iWord || (rWord.length > 3 && (rWord.startsWith(iWord) || iWord.startsWith(rWord))))
  )
  if (matchingWords.length >= 2 || (matchingWords.length >= 1 && (inputWords.length === 1 || registeredWords.length === 1))) {
    return true
  }

  // 3. Typo tolerance: edit distance <= 2
  if (Math.abs(normInput.length - normRegistered.length) <= 3) {
    if (levenshtein(normInput, normRegistered) <= 2) return true
  }

  return false
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return fail('Request origin is not allowed.', 403, 'ORIGIN_NOT_ALLOWED')
  const rateLimit = await checkRateLimit(request, RATE_LIMIT_POLICIES.ATTENDANCE_CHECKIN)
  if (!rateLimit.allowed) {
    return NextResponse.json({ success: false, message: 'Too many check-in attempts. Please try again later.', code: 'RATE_LIMITED' }, {
      status: 429,
      headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    })
  }

  const parsed = await readJsonBody(request, MAX_BODY_BYTES)
  if (!parsed.ok) return fail(parsed.error, parsed.status, 'INVALID_INPUT')
  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) return fail('Enter a valid email address and name.', 400, 'INVALID_INPUT')
  const body = parsed.data as Record<string, unknown>
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('Enter a valid email address.', 400, 'INVALID_INPUT')
  }
  if (!name || name.length < 2 || name.length > 200) {
    return fail('Enter your full registered name.', 400, 'INVALID_INPUT')
  }

  let supabase: ReturnType<typeof createSupabaseServiceClient>
  try {
    supabase = createSupabaseServiceClient()
  } catch {
    return fail('Attendance is temporarily unavailable.', 503, 'PORTAL_OFFLINE')
  }

  const [{ data: portalSetting }, { data: attendanceSetting }] = await Promise.all([
    supabase.from('cgs_portal_settings').select('value').eq('key', 'portal_open').maybeSingle(),
    supabase.from('cgs_portal_settings').select('value').eq('key', 'attendance_open').maybeSingle(),
  ])
  if (portalSetting?.value === 'false') return fail('The attendance portal is currently offline.', 503, 'PORTAL_OFFLINE')
  if (attendanceSetting?.value === 'false') return fail('Attendance check-in is currently closed.', 403, 'ATTENDANCE_CLOSED')

  const requestedSessionId = typeof body.sessionId === 'string' && body.sessionId.length <= 36 ? body.sessionId.trim() : null

  const now = Date.now()
  const { data: sessions, error: sessionError } = await supabase.from('online_sessions')
    .select('id, title, starts_at, ends_at, attendance_starts_at, attendance_ends_at')
    .eq('is_active', true)
    .eq('attendance_open', true)
    .order('starts_at', { ascending: false })
    .limit(100)
  if (sessionError) return fail('Attendance is temporarily unavailable.', 503, 'PORTAL_OFFLINE')

  const session = (sessions ?? []).find((candidate) => {
    if (requestedSessionId && candidate.id !== requestedSessionId) return false
    const attendanceStart = candidate.attendance_starts_at ? new Date(candidate.attendance_starts_at).getTime() : null
    const attendanceEnd = candidate.attendance_ends_at ? new Date(candidate.attendance_ends_at).getTime() : null
    if (attendanceStart !== null && attendanceEnd !== null && Number.isFinite(attendanceStart) && Number.isFinite(attendanceEnd)) {
      return now >= attendanceStart && now <= attendanceEnd
    }
    if (attendanceStart !== null && Number.isFinite(attendanceStart)) {
      return now >= attendanceStart
    }
    if (attendanceEnd !== null && Number.isFinite(attendanceEnd)) {
      return now <= attendanceEnd
    }
    const start = candidate.starts_at ? new Date(candidate.starts_at).getTime() - TWO_HOURS : NaN
    const end = candidate.ends_at
      ? new Date(candidate.ends_at).getTime() + TWO_HOURS
      : (Number.isFinite(start) ? start + 6 * 60 * 60 * 1000 : NaN)
    if (Number.isFinite(start) && Number.isFinite(end)) {
      return now >= start && now <= end
    }
    return true
  })
  if (!session) return fail('There is no session accepting attendance right now.', 403, 'NO_ACTIVE_SESSION')

  // 1. Verify registrant exists by email
  const { data: registrant, error: registrantError } = await supabase.from('cgs_registrants')
    .select('id, name, email')
    .eq('email', email)
    .maybeSingle()
  if (registrantError) return fail('Attendance is temporarily unavailable.', 503, 'PORTAL_OFFLINE')
  if (!registrant) {
    return fail('No registration found for this email address. Please make sure you registered for the session with this email.', 404, 'NOT_REGISTERED')
  }

  // 2. Verify registrant's name matches platform registration
  if (!verifyNameMatch(name, registrant.name)) {
    return fail(
      `The name entered ("${name}") does not match the registration records for ${email}. Please check your spelling or use the name you provided during registration.`,
      403,
      'NAME_MISMATCH'
    )
  }

  // If registrant had no recorded name, update it with verified name
  if (!registrant.name || !registrant.name.trim()) {
    await supabase.from('cgs_registrants').update({ name }).eq('id', registrant.id)
  }

  // 3. Ensure session registration linkage exists
  const { data: registration, error: registrationError } = await supabase.from('cgs_session_registrations')
    .select('id')
    .eq('registrant_id', registrant.id)
    .eq('session_id', session.id)
    .maybeSingle()
  if (registrationError) return fail('Attendance is temporarily unavailable.', 503, 'PORTAL_OFFLINE')
  if (!registration) {
    await supabase.from('cgs_session_registrations').insert({
      registrant_id: registrant.id,
      session_id: session.id,
      source: 'portal-checkin',
    })
  }

  // 4. Record attendance
  const { data: attendanceRecord, error: attendanceError } = await supabase.from('cgs_attendance_records')
    .insert({ registrant_id: registrant.id, session_id: session.id, method: 'portal' })
    .select('id, marked_at')
    .single()
  if (attendanceError?.code === '23505') {
    const { data: existingRecord, error: existingError } = await supabase.from('cgs_attendance_records')
      .select('id, marked_at')
      .eq('registrant_id', registrant.id)
      .eq('session_id', session.id)
      .maybeSingle()
    if (existingError || !existingRecord) return fail('Attendance could not be confirmed. Please try again.', 503, 'PORTAL_OFFLINE')
    return NextResponse.json({
      success: true,
      alreadyMarked: true,
      message: `Your attendance is already on record for ${session.title}.`,
      participantName: registrant.name || name,
      participantEmail: email,
      sessionTitle: session.title,
      markedAt: existingRecord.marked_at,
      certificateId: certificateNumber(existingRecord.id),
    })
  }
  if (attendanceError || !attendanceRecord) return fail('Attendance could not be recorded. Please try again.', 503, 'PORTAL_OFFLINE')

  // Record in audit log
  try {
    const { logAudit } = await import('@/lib/supabase/audit')
    await logAudit({
      action: 'attendance_checkin',
      entity: 'cgs_attendance_records',
      entity_id: String(attendanceRecord.id),
      details: {
        session_title: session.title,
        session_id: session.id,
        participant_name: registrant.name || name,
      },
    })
  } catch (auditError) {
    console.warn('[Audit Log] Failed to log attendance checkin:', auditError)
  }

  return NextResponse.json({
    success: true,
    alreadyMarked: false,
    message: `Attendance recorded for ${session.title}.`,
    participantName: registrant.name || name,
    participantEmail: email,
    sessionTitle: session.title,
    markedAt: attendanceRecord.marked_at,
    certificateId: certificateNumber(attendanceRecord.id),
  })
}
