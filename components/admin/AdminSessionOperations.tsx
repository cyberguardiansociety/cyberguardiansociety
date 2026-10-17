import { requirePermission } from '@/lib/admin-auth'
import {
  SessionsManagementClient,
  TimeManagementClient,
  AttendanceManagementClient,
  RegistrantsManagementClient,
  GoogleSyncManagementClient,
  Alert,
  type PortalSession,
  type AttendanceRow,
  type RegistrantRow,
} from './AdminSessionOperationsClient'

type View = 'sessions' | 'time-management' | 'attendance' | 'registrants' | 'google-sync'

// ─── Server Entry Point ────────────────────────────────────────────────────
export default async function AdminSessionOperations({
  view,
  query = '',
}: {
  view: View
  query?: string
}) {
  const { supabase } = await requirePermission('sessions')

  const { getAllManagedSessions } = await import('@/lib/sessions-store')
  const sessions = (await getAllManagedSessions(supabase, true)) as unknown as PortalSession[]

  // ── 1. Online Sessions Management ─────────────────────────────────────────
  if (view === 'sessions') {
    return (
      <div className="admin-session-operations-container">
        <SessionsManagementClient sessions={sessions} />
      </div>
    )
  }

  // ── 2. Time Management ───────────────────────────────────────────────────
  if (view === 'time-management') {
    return (
      <div className="admin-session-operations-container">
        <TimeManagementClient sessions={sessions} />
      </div>
    )
  }

  // ── 3. Attendance Management ─────────────────────────────────────────────
  if (view === 'attendance') {
    let attQ = supabase
      .from('cgs_attendance_records')
      .select('id, registrant_id, session_id, marked_at, method, override_reason')
      .order('marked_at', { ascending: false })
      .limit(150)

    if (query) {
      const pat = `%${query.slice(0, 100)}%`
      const [{ data: em }, { data: nm }] = await Promise.all([
        supabase.from('cgs_registrants').select('id').ilike('email', pat).limit(100),
        supabase.from('cgs_registrants').select('id').ilike('name', pat).limit(100),
      ])
      const ids = [...new Set([...(em ?? []), ...(nm ?? [])].map((x) => x.id as string))]
      attQ = ids.length ? attQ.in('registrant_id', ids) : attQ.eq('registrant_id', '00000000-0000-0000-0000-000000000000')
    }

    const { data: records, error: attErr } = await attQ
    const rIds = [...new Set((records ?? []).map((r) => r.registrant_id as string))]
    const { data: regRows } = rIds.length
      ? await supabase.from('cgs_registrants').select('id, name, email').in('id', rIds)
      : { data: [] }

    const people = new Map((regRows ?? []).map((r) => [r.id as string, { name: r.name as string, email: r.email as string }]))
    const sessionTitles = new Map(sessions.map((s) => [s.id as string, s.title as string]))

    return (
      <div className="admin-session-operations-container">
        <AttendanceManagementClient
          sessions={sessions}
          records={(records ?? []) as AttendanceRow[]}
          people={people}
          sessionTitles={sessionTitles}
          q={query}
          error={!!attErr}
        />
      </div>
    )
  }

  // ── 4. Registrants Management ────────────────────────────────────────────
  if (view === 'registrants') {
    let regQ = supabase
      .from('cgs_registrants')
      .select('id, email, name, organization, country_city, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(100)

    if (query) {
      const pat = `%${query.slice(0, 100)}%`
      const [{ data: em }, { data: nm }] = await Promise.all([
        supabase.from('cgs_registrants').select('id').ilike('email', pat).limit(500),
        supabase.from('cgs_registrants').select('id').ilike('name', pat).limit(500),
      ])
      const ids = [...new Set([...(em ?? []), ...(nm ?? [])].map((x) => x.id as string))]
      regQ = ids.length ? regQ.in('id', ids) : regQ.eq('id', '00000000-0000-0000-0000-000000000000')
    }

    const { data: registrants, count, error: regErr } = await regQ
    const ids = (registrants ?? []).map((p) => p.id as string)

    const [{ data: regs }, { data: attRecs }] = await Promise.all([
      ids.length ? supabase.from('cgs_session_registrations').select('registrant_id').in('registrant_id', ids) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from('cgs_attendance_records').select('registrant_id').in('registrant_id', ids) : Promise.resolve({ data: [] }),
    ])

    const registrationCounts = new Map<string, number>()
    const attendanceCounts = new Map<string, number>()
    for (const x of regs ?? []) registrationCounts.set(x.registrant_id, (registrationCounts.get(x.registrant_id) ?? 0) + 1)
    for (const x of attRecs ?? []) attendanceCounts.set(x.registrant_id, (attendanceCounts.get(x.registrant_id) ?? 0) + 1)

    return (
      <div className="admin-session-operations-container">
        <RegistrantsManagementClient
          registrants={(registrants ?? []) as RegistrantRow[]}
          count={count ?? 0}
          attendanceLen={attRecs?.length ?? 0}
          registrationCounts={registrationCounts}
          attendanceCounts={attendanceCounts}
          q={query}
          error={!!regErr}
        />
      </div>
    )
  }

  // ── 5. Google Sheets Sync ────────────────────────────────────────────────
  if (view === 'google-sync') {
    const { googleSheetsConfigured } = await import('@/lib/google-sheets')
    const isConfigured = googleSheetsConfigured()
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'cyberguardiansociety@gen-lang-client-0696792386.iam.gserviceaccount.com'

    const [{ data: connections, error: connErr }, { data: syncRuns }] = await Promise.all([
      supabase
        .from('cgs_google_sheet_connections')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('cgs_google_sync_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    return (
      <div className="admin-session-operations-container">
        <GoogleSyncManagementClient
          sessions={sessions}
          connections={(connections ?? []) as any[]}
          syncRuns={(syncRuns ?? []) as any[]}
          isConfigured={isConfigured}
          serviceAccountEmail={serviceAccountEmail}
          error={!!connErr}
        />
      </div>
    )
  }

  return null
}
