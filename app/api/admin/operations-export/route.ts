import { NextResponse } from 'next/server'
import { getAdminContext, hasAdminPermission } from '@/lib/admin-auth'

export const runtime = 'nodejs'

function csvCell(value: unknown) {
  let text = value == null ? '' : String(value)
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

function csvResponse(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(request: Request) {
  const context = await getAdminContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const sessionId = url.searchParams.get('sessionId')
  if (type !== 'registrants' && type !== 'attendance') {
    return NextResponse.json({ error: 'Unsupported export type.' }, { status: 400 })
  }
  if (!hasAdminPermission(context.admin, 'sessions')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (type === 'registrants') {
    const { data: registrants, error } = await context.supabase.from('cgs_registrants')
      .select('id, email, name, whatsapp, organization, country_city, experience_level, created_at')
      .order('created_at', { ascending: false })
      .limit(10_000)
    if (error) return NextResponse.json({ error: 'Registrant export is unavailable.' }, { status: 503 })
    const ids = (registrants ?? []).map((row) => row.id as string)
    const [{ data: registrations }, { data: attendance }] = await Promise.all([
      ids.length ? context.supabase.from('cgs_session_registrations').select('registrant_id, session_id').in('registrant_id', ids) : Promise.resolve({ data: [] }),
      ids.length ? context.supabase.from('cgs_attendance_records').select('registrant_id').in('registrant_id', ids) : Promise.resolve({ data: [] }),
    ])
    const registrationsByRegistrant = new Map<string, string[]>()
    const attendanceCount = new Map<string, number>()
    for (const row of registrations ?? []) {
      const sessionList = registrationsByRegistrant.get(row.registrant_id) ?? []
      sessionList.push(row.session_id)
      registrationsByRegistrant.set(row.registrant_id, sessionList)
    }
    for (const row of attendance ?? []) attendanceCount.set(row.registrant_id, (attendanceCount.get(row.registrant_id) ?? 0) + 1)
    const rows: unknown[][] = [[
      'Name', 'Email', 'WhatsApp', 'Organization', 'Location', 'Experience level',
      'Registered sessions', 'Attendance records', 'Created at (UTC)',
    ]]
    for (const person of registrants ?? []) rows.push([
      person.name, person.email, person.whatsapp, person.organization, person.country_city,
      person.experience_level, (registrationsByRegistrant.get(person.id) ?? []).length,
      attendanceCount.get(person.id) ?? 0, person.created_at,
    ])
    return csvResponse('cgs-registrants.csv', rows)
  }

  let query = context.supabase.from('cgs_attendance_records')
    .select('registrant_id, session_id, marked_at, method, override_reason')
    .order('marked_at', { ascending: false })
    .limit(10_000)
  if (sessionId) query = query.eq('session_id', sessionId)
  const { data: attendance, error } = await query
  if (error) return NextResponse.json({ error: 'Attendance export is unavailable.' }, { status: 503 })
  const registrantIds = [...new Set((attendance ?? []).map((row) => row.registrant_id as string))]
  const sessionIds = [...new Set((attendance ?? []).map((row) => row.session_id as string))]
  const [{ data: registrants }, { data: sessions }] = await Promise.all([
    registrantIds.length ? context.supabase.from('cgs_registrants').select('id, name, email').in('id', registrantIds) : Promise.resolve({ data: [] }),
    sessionIds.length ? context.supabase.from('online_sessions').select('id, title').in('id', sessionIds) : Promise.resolve({ data: [] }),
  ])
  const people = new Map((registrants ?? []).map((row) => [row.id, row]))
  const titles = new Map((sessions ?? []).map((row) => [row.id, row.title]))
  const rows: unknown[][] = [['Name', 'Email', 'Session', 'Marked at (UTC)', 'Method', 'Override reason']]
  for (const record of attendance ?? []) {
    const person = people.get(record.registrant_id)
    rows.push([person?.name, person?.email, titles.get(record.session_id), record.marked_at, record.method, record.override_reason])
  }
  return csvResponse('cgs-attendance.csv', rows)
}
