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
  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) return fail('Enter a valid email address.', 400, 'INVALID_INPUT')
  const body = parsed.data as Record<string, unknown>
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Enter a valid email address.', 400, 'INVALID_INPUT')

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

  const now = Date.now()
  const { data: sessions, error: sessionError } = await supabase.from('online_sessions')
    .select('id, title, starts_at, ends_at, attendance_starts_at, attendance_ends_at')
    .eq('is_active', true)
    .eq('attendance_open', true)
    .order('starts_at', { ascending: false })
    .limit(100)
  if (sessionError) return fail('Attendance is temporarily unavailable.', 503, 'PORTAL_OFFLINE')

  const session = (sessions ?? []).find((candidate) => {
    const attendanceStart = candidate.attendance_starts_at ? new Date(candidate.attendance_starts_at).getTime() : null
    const attendanceEnd = candidate.attendance_ends_at ? new Date(candidate.attendance_ends_at).getTime() : null
    if (attendanceStart !== null && attendanceEnd !== null) return now >= attendanceStart && now <= attendanceEnd
    const start = new Date(candidate.starts_at).getTime() - TWO_HOURS
    const end = new Date(candidate.ends_at).getTime() + TWO_HOURS
    return Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end
  })
  if (!session) return fail('There is no session accepting attendance right now.', 403, 'NO_ACTIVE_SESSION')

  const { data: registrant, error: registrantError } = await supabase.from('cgs_registrants')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (registrantError) return fail('Attendance is temporarily unavailable.', 503, 'PORTAL_OFFLINE')
  if (!registrant) return fail('This email is not registered for the selected session.', 403, 'NOT_REGISTERED')

  const { data: registration, error: registrationError } = await supabase.from('cgs_session_registrations')
    .select('id')
    .eq('registrant_id', registrant.id)
    .eq('session_id', session.id)
    .maybeSingle()
  if (registrationError) return fail('Attendance is temporarily unavailable.', 503, 'PORTAL_OFFLINE')
  if (!registration) {
    return fail('This email is not registered for the selected session.', 403, 'NOT_REGISTERED')
  }

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
      message: `Your attendance is already on record for ${session.title}.`,
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
      },
    })
  } catch (auditError) {
    console.warn('[Audit Log] Failed to log attendance checkin:', auditError)
  }

  return NextResponse.json({
    success: true,
    message: `Attendance recorded for ${session.title}.`,
    sessionTitle: session.title,
    markedAt: attendanceRecord.marked_at,
    certificateId: certificateNumber(attendanceRecord.id),
  })
}
