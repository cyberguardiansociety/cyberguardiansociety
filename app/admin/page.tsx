import Link from 'next/link'
import { ArrowRight, CalendarDays, Check, Clock3, Radio, ShieldCheck } from 'lucide-react'
import { requireAdmin } from '@/lib/admin-auth'
import { signOut } from '@/app/admin/actions'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminApplications from '@/components/admin/AdminApplications'
import AdminInbox from '@/components/admin/AdminInbox'
import AdminSessionOperations from '@/components/admin/AdminSessionOperations'
import AdminManagedContent from '@/components/admin/AdminManagedContent'
import AdminAdministrators from '@/components/admin/AdminAdministrators'
import AdminSpeakerApplications from '@/components/admin/AdminSpeakerApplications'
import AdminAuditLog, { type AuditLogEntry } from '@/components/admin/AdminAuditLog'
import AdminSettings from '@/components/admin/AdminSettings'
import { hasAdminPermission, type AdminPermission } from '@/lib/admin-auth'

type SessionOperationsView = 'sessions' | 'time-management' | 'attendance' | 'registrants' | 'google-sync'
const sessionViews = new Set<string>(['sessions', 'time-management', 'attendance', 'registrants', 'google-sync'])

const operationErrors: Record<string, string> = {
  invalid:             'Review the submitted values and try again.',
  save:                'The session could not be saved. Confirm the attendance portal migration is applied.',
  delete:              'The requested record could not be deleted.',
  'speaker-save':      'Session saved, but speaker assignments could not be updated.',
  'invalid-time':      'Enter valid times in the selected timezone; the end must follow the start.',
  'invalid-window':    'The attendance window values are invalid.',
  'invalid-duration':  'Choose a duration within the allowed range.',
  'not-found':         'The requested record was not found.',
  'invalid-status':    'Choose a valid session status.',
  'invalid-override':  'Enter a valid registrant email and an override reason of at least 10 characters.',
  'registrant-not-found': 'No registrant was found with that email.',
  'not-registered':    'That registrant is not registered for this session.',
  'already-marked':    'Attendance is already recorded for this registrant.',
  'invalid-connection':'Check the connection name, spreadsheet ID, and sheet/range.',
  'connection-save':   'The Google Sheets connection could not be saved.',
  'connection-delete': 'The Google Sheets connection could not be deleted.',
  'sync-failed':       'Sync failed. Check service-account access and the Google sync history.',
  'attendance-closed': 'Attendance check-in is currently closed.',
  'inbox-save':        'The inbox status could not be updated.',
  'inbox-delete':      'The inbox message could not be deleted.',
  'application-invalid':'Check the application details and try again.',
  'application-unavailable':'The application record is unavailable.',
  'application-save':   'The application review status could not be saved.',
  'application-delete': 'The application could not be deleted.',
  forbidden:           'Your administrator account does not have access to that section.',
  'content-invalid':   'Check the content fields and try again.',
  'content-save':      'The content could not be saved.',
  'content-delete':    'The content could not be deleted.',
  'settings-confirmation': 'The confirmation text did not match. No action was taken.',
  'audit-delete-confirmation': 'Type DELETE ALL AUDIT LOGS exactly to confirm. No logs were deleted.',
  'audit-delete':        'The audit logs could not be deleted. Please retry.',
  'settings-save':     'The setting could not be saved. Please retry.',
  'settings-action':   'The requested action could not be completed.',
  'image-invalid':     'Choose a valid PNG, JPEG, or WebP image smaller than 5 MB.',
  'payment-invalid':   'Check the payment entry and try again.',
  'payment-save':      'The payment entry could not be saved.',
  'admin-invalid':     'Check the administrator details and permissions.',
  'admin-invalid-email': 'Please enter a valid administrator email address.',
  'admin-weak-password': 'Administrator password must be at least 12 characters.',
  'admin-no-permissions': 'Please select at least one permission for this administrator.',
  'admin-exists':      'An administrator with this email address already exists.',
  'admin-create':      'The administrator account could not be created. Please verify details.',
  'admin-save':        'The administrator account could not be updated.',
  'admin-protected-delete': 'The primary administrator account is protected and cannot be deleted.',
  'admin-delete-failed': 'Could not delete administrator account. Please try again.',
  'speaker-invalid':   'The speaker application could not be found.',
  'speaker-delete':    'The speaker application could not be deleted.',
}

const operationStatuses: Record<string, string> = {
  'session-created':    'Session created.',
  'session-saved':      'Session updated.',
  'session-deleted':    'Session deleted.',
  'content-saved':      'Content saved.',
  'content-deleted':    'Content deleted.',
  'payment-created':    'Payment ledger entry recorded.',
  'payment-updated':    'Payment status updated.',
  'admin-created':      'Limited administrator created.',
  'admin-updated':      'Administrator access updated.',
  'admin-deleted':      'Administrator account was permanently removed.',
  'speaker-application-deleted': 'Speaker application deleted.',
  'timing-saved':       'Timing and attendance window updated.',
  'session-started':    'Session is live and attendance is open.',
  'session-extended':   'Session end time extended.',
  'attendance-marked':  'Attendance override recorded.',
  'attendance-removed': 'Attendance record removed.',
  'registrant-deleted': 'Registrant removed.',
  'speaker-created':    'Speaker profile created.',
  'speaker-saved':      'Speaker profile saved.',
  'speaker-deleted':    'Speaker profile removed.',
  'connection-created': 'Google Sheets connection created.',
  'connection-saved':   'Google Sheets connection saved.',
  'connection-deleted': 'Google Sheets connection removed.',
  'sync-complete':      'Google Sheets sync completed.',
  'sync-run-deleted':   'Synchronization log entry removed.',
  'sync-history-cleared': 'Synchronization audit log cleared.',
  'inbox-updated':      'Inbox status updated.',
  'inbox-deleted':      'Inbox message deleted.',
  'inbox-cleared':      'Closed inbox messages removed.',
  'application-updated':'Application review status saved.',
  'application-deleted':'Application and submitted documents deleted.',
  'setting-saved':      'Setting updated.',
  'settings-reset':     'All site settings were restored to their defaults.',
  'lockouts-cleared':   'Administrator login lockout records were cleared.',
  'draft-content-deleted': 'Draft content was deleted.',
  'maintenance-message-saved': 'Maintenance notice updated.',
  'audit-logs-cleared': 'All audit logs were deleted.',
  'traffic-logs-cleared': 'All traffic logs and threat alerts have been cleared.',
}

type SessionRow = {
  id: string
  title: string
  description: string
  starts_at: string
  platform: string
  href: string
  status: 'current' | 'upcoming'
  is_published: boolean
}

type ActivityRow = {
  action: string
  entity: string
  entity_id: string | null
  created_at: string
}

const views = {
  overview: {
    title: 'Overview',
    description: 'A live readout of the content and operations in your workspace.',
  },
  sessions: {
    title: 'Online sessions',
    description: 'Create, schedule, publish, and manage community sessions.',
  },
  'time-management': {
    title: 'Time management',
    description: 'Control session schedules, live operations, and attendance verification windows.',
  },
  attendance: {
    title: 'Attendance',
    description: 'Review verified check-ins and record documented attendance overrides.',
  },
  registrants: {
    title: 'Registrants',
    description: 'Search participant records and review session bookings and attendance.',
  },
  'google-sync': {
    title: 'Google Sheets sync',
    description: 'Connect your Google registration form spreadsheet and sync all registered participants.',
  },
  applications: {
    title: 'CGS Team Applications',
    description: 'Review CGS team membership submissions and candidate applications.',
  },
  inbox: {
    title: 'Inbox',
    description: 'Review contact messages and membership enquiries.',
  },
  activity: {
    title: 'Activity log',
    description: 'Recent changes made to managed website content.',
  },
  'speaker-applications': {
    title: 'Speaker applications',
    description: 'Review proposals submitted through Join as a speaker.',
  },
  announcements: {
    title: 'Announcements',
    description: 'Create, publish, edit, and remove public announcements.',
  },
  products: {
    title: 'Products',
    description: 'Manage product listings, descriptions, links, and images.',
  },
  merchandise: {
    title: 'Merchandise',
    description: 'Manage merchandise listings, prices, descriptions, and images.',
  },
  resources: {
    title: 'Free resources',
    description: 'Manage learning resources shown on the public Products page.',
  },
  administrators: {
    title: 'Administrators',
    description: 'Provision limited admin accounts and assign their allowed sections.',
  },
  settings: {
    title: 'Settings management',
    description: 'Manage site operations, application availability, security links, and sensitive actions.',
  },
} as const

const viewPermissions: Partial<Record<keyof typeof views, AdminPermission>> = {
  sessions: 'sessions',
  'time-management': 'sessions',
  attendance: 'sessions',
  registrants: 'sessions',
  'google-sync': 'google_sync',
  applications: 'applications',
  inbox: 'inbox',
  activity: 'audit',
  'speaker-applications': 'speaker_applications',
  announcements: 'content_announcement',
  products: 'content_product',
  merchandise: 'content_merchandise',
  resources: 'content_resource',
  administrators: 'admins',
  settings: 'admins',
}

function formatUtc(value: string) {
  return `${new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))} UTC`
}

function SessionCard({ session }: { session: SessionRow }) {
  return (
    <div className="admin-session admin-session__summary">
      <span className="admin-session__icon">
        <CalendarDays size={16} />
      </span>
      <span className="admin-session__copy">
        <strong>{session.title}</strong>
        <small>{formatUtc(session.starts_at)} · {session.platform}</small>
      </span>
      <span className="admin-status" data-muted={!session.is_published}>
        {session.is_published ? 'Published' : 'Draft'}
      </span>
      <Link href="?view=sessions" className="admin-session__edit">
        Manage
      </Link>
    </div>
  )
}

function ActivityFeed({ entries }: { entries: ActivityRow[] }) {
  if (!entries.length) {
    return <p className="admin-empty admin-surface">No changes have been recorded yet.</p>
  }
  return (
    <div className="admin-activity-list">
      {entries.map((entry, index) => (
        <div className="admin-activity-row" key={`${entry.created_at}-${index}`}>
          <span className="admin-activity-row__dot" />
          <strong>{entry.action}</strong>
          <span>{entry.entity.replaceAll('_', ' ')}</span>
          <time dateTime={entry.created_at}>{formatUtc(entry.created_at)}</time>
        </div>
      ))}
    </div>
  )
}

function ActivityTable({ entries }: { entries: ActivityRow[] }) {
  return (
    <div className="admin-surface admin-table-wrap">
      {entries.length ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Section</th>
              <th>Record</th>
              <th>Time (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={`${entry.created_at}-${index}`}>
                <td data-label="Action"><span className="admin-status">{entry.action}</span></td>
                <td data-label="Section">{entry.entity.replaceAll('_', ' ')}</td>
                <td data-label="Record" className="admin-table__id">{entry.entity_id}</td>
                <td data-label="Time (UTC)">{formatUtc(entry.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="admin-empty">No activity has been recorded yet.</p>
      )}
    </div>
  )
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { supabase, user, admin } = await requireAdmin()
  const params = await searchParams
  const requestedView = typeof params.view === 'string' ? params.view : undefined
  const queryError   = typeof params.error === 'string' ? params.error : undefined
  const queryErrorMessage = typeof params.error_message === 'string' ? params.error_message : undefined
  const status       = typeof params.status === 'string' ? params.status : undefined
  const settingsTab  = typeof params.tab === 'string' ? params.tab : 'general'
  const q            = typeof params.q === 'string' ? params.q : ''
  const filter       = typeof params.filter === 'string' ? params.filter : ''
  const requestedKey = requestedView && requestedView in views ? requestedView as keyof typeof views : undefined
  const requiredPermission = requestedKey ? viewPermissions[requestedKey] : undefined
  const deniedView = Boolean(
    (requiredPermission && !hasAdminPermission(admin, requiredPermission)) ||
    (requestedKey === 'settings' && admin.role !== 'super_admin'),
  )
  const activeView = deniedView ? 'overview' : requestedKey ?? 'overview'

  let sessions: SessionRow[] = []
  let sessionsError: any = null
  let activity: AuditLogEntry[] = []
  let totalActivityCount = 0

  if (activeView === 'overview') {
    const [{ data: sessionsData, error: sErr }, { data: activityData, count: aCount }] = await Promise.all([
      supabase
        .from('online_sessions')
        .select('id, title, description, starts_at, platform, href, status, is_published')
        .order('starts_at', { ascending: true }),
      supabase
        .from('admin_audit_log')
        .select('id, actor_id, action, entity, entity_id, details, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(6),
    ])
    sessions = (sessionsData ?? []) as SessionRow[]
    sessionsError = sErr
    activity = (activityData ?? []) as AuditLogEntry[]
    totalActivityCount = aCount ?? activity.length
  } else if (activeView === 'activity') {
    const { data: activityData } = await supabase
      .from('admin_audit_log')
      .select('id, actor_id, action, entity, entity_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(300)
    activity = (activityData ?? []) as AuditLogEntry[]
  }

  const upcomingCount = sessions.filter((s) => s.status === 'upcoming').length
  const publishedCount = sessions.filter((s) => s.is_published).length
  const page          = views[activeView]

  return (
    <div className="admin-workspace">
      <AdminSidebar
        activeView={activeView}
        email={user.email ?? 'Administrator'}
        role={admin.role}
        permissionKeys={Array.isArray(admin.permission_keys) ? admin.permission_keys as string[] : []}
      />

      <main id="main" className="admin-main">

        {/* ── Page header ───────────────────────────────────────────── */}
        <header className="admin-page-head">
          <div className="admin-page-head__main">
            <p className="admin-kicker">Cyber Guardian Society / Operations</p>
            <h1 className="admin-page-title">{page.title}</h1>
            <p className="admin-page-description">{page.description}</p>
          </div>
          <div className="admin-head-meta">
            <span className="admin-live"><span /> Workspace active</span>
            <span className="admin-date">
              {new Intl.DateTimeFormat('en', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date())} · UTC
            </span>
          </div>
        </header>

        {/* ── Alerts ────────────────────────────────────────────────── */}
        {(queryError || queryErrorMessage || sessionsError || deniedView) ? (
          <p role="alert" className="admin-alert admin-alert--error">
            {deniedView
              ? operationErrors.forbidden
              : queryErrorMessage
              ? queryErrorMessage
              : queryError
              ? operationErrors[queryError] ?? 'The requested operation could not be completed.'
              : 'Session storage is unavailable. Apply the supplied Supabase migration, then reload.'}
          </p>
        ) : null}

        {status ? (
          <p role="status" className="admin-alert">
            <Check size={14} />
            {operationStatuses[status] ?? (status === 'created' ? 'Session created.' : 'Session saved.')}
          </p>
        ) : null}


        {/* ── Overview ──────────────────────────────────────────────── */}
        {activeView === 'overview' ? (
          <>
            {/* Metric strip */}
            <section className="admin-metrics" aria-label="Workspace summary">
              <div className="admin-metric">
                <span className="admin-metric__icon"><CalendarDays size={15} /></span>
                <p className="admin-metric__label">Total sessions</p>
                <p className="admin-metric__value">{sessions.length}</p>
              </div>
              <div className="admin-metric">
                <span className="admin-metric__icon"><Clock3 size={15} /></span>
                <p className="admin-metric__label">Upcoming</p>
                <p className="admin-metric__value">{upcomingCount}</p>
              </div>
              <div className="admin-metric">
                <span className="admin-metric__icon"><Radio size={15} /></span>
                <p className="admin-metric__label">Published</p>
                <p className="admin-metric__value">{publishedCount}</p>
              </div>
              <div className="admin-metric">
                <span className="admin-metric__icon"><ShieldCheck size={15} /></span>
                <p className="admin-metric__label">Recent actions</p>
                <p className="admin-metric__value">{totalActivityCount || activity.length}</p>
              </div>
            </section>

            {/* Sessions preview */}
            <section className="admin-section">
              <div className="admin-section__head">
                <div>
                  <p className="admin-kicker">Content operations</p>
                  <h2>Online sessions</h2>
                </div>
                <Link href="?view=sessions">
                  Manage sessions <ArrowRight size={13} />
                </Link>
              </div>
              <div className="admin-session-list">
                {sessions.length
                  ? sessions.slice(0, 4).map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))
                  : (
                    <p className="admin-empty admin-surface">
                      No sessions yet. Add your first session from the Online sessions section.
                    </p>
                  )}
              </div>
            </section>

            {/* Activity feed */}
            <section className="admin-section">
              <div className="admin-section__head">
                <div>
                  <p className="admin-kicker">Audit trail</p>
                  <h2>Recent activity</h2>
                </div>
                <Link href="?view=activity">
                  View all activity <ArrowRight size={13} />
                </Link>
              </div>
              <ActivityFeed entries={activity.slice(0, 6)} />
            </section>
          </>
        ) : null}

        {/* ── Session management views ───────────────────────────────── */}
        {sessionViews.has(activeView) ? (
          <AdminSessionOperations view={activeView as SessionOperationsView} query={q} />
        ) : null}

        {/* ── Applications ──────────────────────────────────────────── */}
        {activeView === 'applications' ? <AdminApplications query={q} statusFilter={filter} /> : null}

        {/* ── Inbox ─────────────────────────────────────────────────── */}
        {activeView === 'inbox' ? <AdminInbox query={q} statusFilter={filter} /> : null}

        {/* ── Activity log (full table) ──────────────────────────────── */}
        {activeView === 'activity' ? (
          <AdminAuditLog
            initialEntries={activity}
            currentAdminEmail={user.email ?? undefined}
            canClearAuditLogs={admin.role === 'super_admin' || hasAdminPermission(admin, 'audit')}
          />
        ) : null}

        {activeView === 'speaker-applications' ? <AdminSpeakerApplications /> : null}
        {activeView === 'announcements' ? <AdminManagedContent type="announcement" /> : null}
        {activeView === 'products' ? <AdminManagedContent type="product" /> : null}
        {activeView === 'merchandise' ? <AdminManagedContent type="merchandise" /> : null}
        {activeView === 'resources' ? <AdminManagedContent type="resource" /> : null}
        {activeView === 'administrators' ? <AdminAdministrators /> : null}
        {activeView === 'settings' ? <AdminSettings tab={settingsTab} /> : null}

      </main>
    </div>
  )
}
