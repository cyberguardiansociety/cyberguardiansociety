import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMIT_POLICIES } from '@/lib/security/public-rate-limiter'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

const CERTIFICATE_PATTERN = /^CGS-([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

export async function GET(request: Request) {
  const rateLimit = await checkRateLimit(request, RATE_LIMIT_POLICIES.CERTIFICATE_VERIFY)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { valid: false, message: 'Too many lookups. Please try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  const certificateNumber = new URL(request.url).searchParams.get('code')?.trim().toUpperCase() ?? ''
  const certificateMatch = CERTIFICATE_PATTERN.exec(certificateNumber)
  if (!certificateMatch) {
    return NextResponse.json({ valid: false, message: 'Enter the full certificate number, including the CGS- prefix.' }, { status: 400 })
  }
  const attendanceId = certificateMatch[1]

  let supabase: ReturnType<typeof createSupabaseServiceClient>
  try {
    supabase = createSupabaseServiceClient()
  } catch {
    return NextResponse.json({ valid: false, message: 'Certificate lookup is temporarily unavailable.' }, { status: 503 })
  }

  const { data: attendance, error: attendanceError } = await supabase.from('cgs_attendance_records')
    .select('id, registrant_id, session_id, marked_at')
    .eq('id', attendanceId)
    .maybeSingle()
  if (attendanceError) {
    return NextResponse.json({ valid: false, message: 'Certificate lookup is temporarily unavailable.' }, { status: 503 })
  }
  if (!attendance) {
    return NextResponse.json({ valid: false, message: 'We could not find a certificate with that ID.' }, { status: 404 })
  }

  const [{ data: registrant, error: registrantError }, { data: session, error: sessionError }] = await Promise.all([
    supabase.from('cgs_registrants').select('name').eq('id', attendance.registrant_id).maybeSingle(),
    supabase.from('online_sessions').select('title').eq('id', attendance.session_id).maybeSingle(),
  ])
  if (registrantError || sessionError || !session) {
    return NextResponse.json({ valid: false, message: 'Certificate details are temporarily unavailable.' }, { status: 503 })
  }

  return NextResponse.json(
    {
      valid: true,
      message: 'This certificate is authentic and matches a recorded CGS session attendance.',
      certificate: {
        id: certificateNumber,
        participant: registrant?.name?.trim() || 'CGS participant',
        sessionTitle: session.title,
        issuedAt: attendance.marked_at,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
