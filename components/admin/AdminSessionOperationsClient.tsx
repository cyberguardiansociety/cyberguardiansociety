'use client'

import { useState, useMemo } from 'react'
import {
  ChevronDown,
  Check,
  Search,
  Calendar,
  Clock,
  Video,
  Plus,
  Trash2,
  ExternalLink,
  Radio,
  CalendarDays,
  Sparkles,
  AlertCircle,
  Users,
  ClipboardCheck,
  ShieldCheck,
  Download,
  CalendarClock,
  Tag,
  Building,
  MapPin,
  X,
  RefreshCw,
  Copy,
  FileSpreadsheet,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { utcToZonedLocalInput } from '@/lib/timezone'
import AdminCombobox from '@/components/admin/AdminCombobox'
import {
  createManagedSession,
  updateManagedSession,
  deleteManagedSession,
  updateManagedTiming,
  quickStartManagedSession,
  extendManagedSession,
  markAttendanceOverride,
  removeManualAttendance,
  deleteRegistrant,
  createGoogleConnection,
  updateGoogleConnection,
  setGoogleConnectionActive,
  syncGoogleConnectionNow,
  deleteGoogleConnection,
} from '@/app/admin/operations-actions'

// ─── Types ──────────────────────────────────────────────────────────────────
export type PortalSession = {
  id: string
  title: string
  slug: string
  description: string
  full_description: string | null
  starts_at: string
  ends_at: string | null
  timezone: string
  href: string
  management_status: string
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
}

export type AttendanceRow = {
  id: string
  registrant_id: string
  session_id: string
  marked_at: string
  method: string
  override_reason: string | null
}

export type RegistrantRow = {
  id: string
  email: string
  name: string
  organization: string | null
  country_city: string | null
  created_at: string
}

export type GoogleConnectionRow = {
  id: string
  name: string
  spreadsheet_id: string
  sheet_name: string
  is_active: boolean
  last_synced_at: string | null
  created_by?: string | null
  created_at: string
  updated_at?: string
}

export type GoogleSyncRunRow = {
  id: string
  connection_id: string
  status: 'running' | 'success' | 'error'
  started_at: string
  finished_at: string | null
  rows_read: number
  created_count: number
  updated_count: number
  duplicate_count: number
  invalid_count: number
  error_message: string | null
  details?: unknown
  created_at: string
}

const defaultTimezone = 'Asia/Karachi'

function displayDate(value: string | null, timezone = defaultTimezone) {
  if (!value) return 'Not set'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return 'Not set'
  return `${new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(d)} ${timezone}`
}

function formatDuration(startsAt: string, endsAt: string | null) {
  if (!endsAt) return 'Open ended'
  try {
    const start = new Date(startsAt).getTime()
    const end = new Date(endsAt).getTime()
    const diffMin = Math.round((end - start) / 60000)
    if (diffMin <= 0) return '0 min'
    if (diffMin < 60) return `${diffMin} min`
    const hrs = Math.floor(diffMin / 60)
    const mins = diffMin % 60
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
  } catch {
    return '—'
  }
}

// ─── Smooth accordion card ──────────────────────────────────────────────────
export function AccordionCard({
  header,
  children,
  defaultOpen = false,
}: {
  header: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const reduceMotion = useReducedMotion()

  return (
    <div className={`session-accordion-card ${open ? 'session-accordion-card--open' : ''}`}>
      <button
        type="button"
        aria-expanded={open}
        className="session-accordion-header"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="session-accordion-header__content">{header}</div>
        <div className="session-accordion-header__chevron">
          <ChevronDown
            size={16}
            className={`session-chevron ${open ? 'session-chevron--open' : ''}`}
          />
        </div>
      </button>

      <motion.div
        className="session-accordion-body"
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.18 },
              }
        }
      >
        <div className="session-accordion-inner">{children}</div>
      </motion.div>
    </div>
  )
}

// ─── Alert ──────────────────────────────────────────────────────────────────
const ERR: Record<string, string> = {
  invalid: 'Review the session fields; the dates, URL, or status are invalid.',
  save: 'The change could not be saved. Please verify database connection and constraints.',
  delete: 'The session could not be deleted.',
  'speaker-save': 'Session saved, but speaker assignments did not update.',
  'invalid-time': 'Enter a valid start and end in the selected timezone; end must follow start.',
  'invalid-window': 'The attendance window must have valid start and end times.',
  'invalid-duration': 'Enter a duration within the allowed range.',
  'not-found': 'That record could not be found.',
  'invalid-status': 'Choose a valid lifecycle status.',
  'invalid-override': 'Enter a valid session, registrant email, and an override reason of at least 10 characters.',
  'registrant-not-found': 'No registrant with that email was found.',
  'not-registered': 'That registrant is not registered for this session.',
  'already-marked': 'Attendance is already recorded for that registrant and session.',
  'invalid-connection': 'Check the connection name, spreadsheet ID, and sheet/range.',
  'connection-save': 'The Google Sheets connection could not be saved.',
  'sync-failed': 'Sync failed. Check service-account access, sheet sharing, and sync history.',
}

const OK: Record<string, string> = {
  'attendance-marked': 'Attendance override recorded successfully.',
  'attendance-removed': 'Manual attendance override removed.',
  'registrant-deleted': 'Registrant and related records removed.',
  'speaker-created': 'Speaker profile created successfully.',
  'speaker-saved': 'Speaker profile saved.',
  'speaker-deleted': 'Speaker profile removed.',
  'session-created': 'Session created and published successfully.',
  'session-saved': 'Session updated successfully.',
  'session-deleted': 'Session and related records removed.',
  'timing-saved': 'Schedule and attendance window updated.',
  'session-started': 'Session is now live and attendance is open.',
  'session-extended': 'Session end time extended.',
  'connection-created': 'Google Sheets connection created.',
  'connection-saved': 'Google Sheets connection updated.',
  'sync-complete': 'Google Sheets sync completed.',
}

export function Alert({ error, status }: { error?: string; status?: string }) {
  if (!error && !status) return null
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`admin-alert ${error ? 'admin-alert--error' : ''}`}
      style={{ marginBottom: '20px' }}
    >
      {error ? (
        <AlertCircle size={15} />
      ) : (
        <Check size={15} />
      )}
      <span>{error ? ERR[error] ?? 'The requested change could not be completed.' : OK[status ?? ''] ?? 'Changes saved.'}</span>
    </div>
  )
}

// ─── 1. Sessions Management: Form Component ────────────────────────────────
export function SessionFields({
  session,
  isEdit = false,
}: {
  session?: PortalSession
  isEdit?: boolean
}) {
  const action = session ? updateManagedSession : createManagedSession
  const timeZone = session?.timezone || defaultTimezone

  return (
    <form action={action} className="cms-editor-form">
      {session && <input type="hidden" name="id" value={session.id} />}

      {/* Section 1: Session Identity */}
      <div className="cms-form-section">
        <div className="cms-section-tag">
          <Sparkles size={13} className="text-blue-400" />
          <span>Session Overview</span>
        </div>

        <div className="cms-form-group">
          <label className="cms-form-label">
            <span>Session Title <strong className="cms-required">*</strong></span>
            <input
              name="title"
              required
              minLength={3}
              maxLength={160}
              defaultValue={session?.title}
              placeholder="e.g. Threat Intelligence & OSINT Masterclass"
              className="cms-form-input"
            />
          </label>
        </div>

        <div className="cms-form-group">
          <label className="cms-form-label">
            <span>Summary &amp; Key Takeaways <strong className="cms-required">*</strong></span>
            <textarea
              name="description"
              required
              minLength={5}
              maxLength={5000}
              rows={3}
              defaultValue={session?.description}
              placeholder="Provide a concise summary of what attendees will learn in this session..."
              className="cms-form-textarea"
            />
          </label>
        </div>
      </div>

      {/* Section 2: Timing & Platform Access */}
      <div className="cms-form-section">
        <div className="cms-section-tag">
          <Clock size={13} className="text-emerald-400" />
          <span>Schedule &amp; Platform</span>
        </div>

        <div className="cms-form-row">
          <div className="cms-form-group">
            <label className="cms-form-label">
              <span>Start Time <strong className="cms-required">*</strong></span>
              <input
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={session ? utcToZonedLocalInput(session.starts_at, timeZone) : ''}
                className="cms-form-input"
              />
            </label>
          </div>

          <div className="cms-form-group">
            <label className="cms-form-label">
              <span>End Time <strong className="cms-required">*</strong></span>
              <input
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={session?.ends_at ? utcToZonedLocalInput(session.ends_at, timeZone) : ''}
                className="cms-form-input"
              />
            </label>
          </div>
        </div>

        <div className="cms-form-row">
          <div className="cms-form-group">
            <label className="cms-form-label">
              <span>Timezone</span>
              <input
                name="timezone"
                required
                maxLength={80}
                defaultValue={timeZone}
                placeholder="Asia/Karachi"
                className="cms-form-input"
              />
            </label>
          </div>

          <div className="cms-form-group">
            <label className="cms-form-label">
              <span>Google Meet / Session URL</span>
              <input
                name="meetLink"
                maxLength={2048}
                defaultValue={session?.href === '/' ? '' : session?.href}
                placeholder="https://meet.google.com/..."
                className="cms-form-input"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Section 3: Lifecycle & Visibility */}
      <div className="cms-form-section">
        <div className="cms-section-tag">
          <ShieldCheck size={13} className="text-purple-400" />
          <span>Status &amp; Verification Flags</span>
        </div>

        <div className="cms-form-group">
          <AdminCombobox
            name="managementStatus"
            label="Lifecycle State"
            defaultValue={session?.management_status || 'UPCOMING'}
            options={[
              { value: 'UPCOMING', label: 'Upcoming (Scheduled)' },
              { value: 'LIVE', label: 'Live Broadcast' },
              { value: 'DRAFT', label: 'Draft (Internal Only)' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
            placeholder="Select lifecycle state…"
          />
        </div>

        <div className="cms-checkbox-grid">
          <label className="cms-checkbox-label">
            <input
              name="isPublished"
              type="checkbox"
              defaultChecked={session?.is_published ?? true}
            />
            <span className="cms-checkbox-custom" />
            <span className="cms-checkbox-text">
              <strong>Publish on Website</strong>
              <small>Display on public schedules &amp; home</small>
            </span>
          </label>

          <label className="cms-checkbox-label">
            <input
              name="registrationOpen"
              type="checkbox"
              defaultChecked={session?.registration_open ?? true}
            />
            <span className="cms-checkbox-custom" />
            <span className="cms-checkbox-text">
              <strong>Registration Open</strong>
              <small>Allow new participants to sign up</small>
            </span>
          </label>

          <label className="cms-checkbox-label">
            <input
              name="attendanceOpen"
              type="checkbox"
              defaultChecked={session?.attendance_open}
            />
            <span className="cms-checkbox-custom" />
            <span className="cms-checkbox-text">
              <strong>Attendance Open</strong>
              <small>Enable verification &amp; QR check-in</small>
            </span>
          </label>

          <label className="cms-checkbox-label">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={session?.is_active ?? true}
            />
            <span className="cms-checkbox-custom" />
            <span className="cms-checkbox-text">
              <strong>Active Record</strong>
              <small>Maintain in active directory</small>
            </span>
          </label>
        </div>
      </div>

      <div className="cms-form-actions">
        <button className="admin-primary-button" type="submit">
          {session ? <Check size={14} /> : <Plus size={14} />}
          {session ? 'Save Session Changes' : 'Create Online Session'}
        </button>
      </div>
    </form>
  )
}

// ─── 1. Sessions Management: Main Client Component ──────────────────────────
export function SessionsManagementClient({
  sessions,
}: {
  sessions: PortalSession[]
}) {
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts' | 'live' | 'upcoming' | 'completed'>('all')
  const [search, setSearch] = useState('')

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filter === 'published' && !s.is_published) return false
      if (filter === 'drafts' && s.is_published) return false
      if (filter === 'live' && s.management_status !== 'LIVE') return false
      if (filter === 'upcoming' && s.management_status !== 'UPCOMING') return false
      if (filter === 'completed' && s.management_status !== 'COMPLETED') return false

      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const titleMatch = s.title?.toLowerCase().includes(q)
        const slugMatch = s.slug?.toLowerCase().includes(q)
        const descMatch = s.description?.toLowerCase().includes(q)
        if (!titleMatch && !slugMatch && !descMatch) return false
      }
      return true
    })
  }, [sessions, filter, search])

  const publishedCount = sessions.filter((s) => s.is_published).length
  const draftCount = sessions.filter((s) => !s.is_published).length
  const liveCount = sessions.filter((s) => s.management_status === 'LIVE').length

  return (
    <div className="cms-screen-container">
      {/* ── Top Statistics Strip ── */}
      <div className="cms-stats-grid">
        <div className="cms-stat-card">
          <div className="cms-stat-icon cms-stat-icon--cobalt">
            <CalendarDays size={18} />
          </div>
          <div className="cms-stat-info">
            <span className="cms-stat-label">Total Sessions</span>
            <strong className="cms-stat-value">{sessions.length}</strong>
          </div>
        </div>

        <div className="cms-stat-card">
          <div className="cms-stat-icon cms-stat-icon--green">
            <Check size={18} />
          </div>
          <div className="cms-stat-info">
            <span className="cms-stat-label">Published</span>
            <strong className="cms-stat-value">{publishedCount}</strong>
          </div>
        </div>

        <div className="cms-stat-card">
          <div className="cms-stat-icon cms-stat-icon--amber">
            <CalendarClock size={18} />
          </div>
          <div className="cms-stat-info">
            <span className="cms-stat-label">Drafts</span>
            <strong className="cms-stat-value">{draftCount}</strong>
          </div>
        </div>

        <div className="cms-stat-card">
          <div className="cms-stat-icon cms-stat-icon--purple">
            <Radio size={18} />
          </div>
          <div className="cms-stat-info">
            <span className="cms-stat-label">Live Broadcasts</span>
            <strong className="cms-stat-value">{liveCount}</strong>
          </div>
        </div>
      </div>

      {/* ── Two-Column Screen Layout ── */}
      <div className="cms-split-grid" style={{ marginTop: '16px' }}>
        {/* Left Column: Create New Record Form */}
        <div className="cms-form-col">
          <div className="cms-form-card">
            <div className="cms-form-card__head">
              <div className="cms-form-icon-wrap">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="cms-form-title">Create New Session</h3>
                <p className="cms-form-subtitle">Add a workshop, webinar, or masterclass</p>
              </div>
            </div>
            <div className="cms-form-card__body">
              <SessionFields />
            </div>
          </div>
        </div>

        {/* Right Column: Published & Drafts Session Cards */}
        <div className="cms-records-col">
          <div className="cms-records-card">
            <div className="cms-records-card__head">
              <div className="cms-records-title-wrap">
                <h3 className="cms-records-title">Session Roster &amp; Published Content</h3>
                <span className="cms-records-count">{sessions.length} total sessions</span>
              </div>
            </div>

            <div className="sessions-list-container" style={{ padding: '14px' }}>
              <div className="cms-filter-toolbar" style={{ marginBottom: '16px' }}>
                <div className="cms-filter-search">
                  <Search size={14} className="cms-search-icon" />
                  <input
                    type="text"
                    placeholder="Search sessions by title or slug..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="cms-search-input"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="cms-search-clear"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="cms-category-tabs">
                  <button
                    type="button"
                    className={`cms-tab-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    All ({sessions.length})
                  </button>
                  <button
                    type="button"
                    className={`cms-tab-btn ${filter === 'published' ? 'active' : ''}`}
                    onClick={() => setFilter('published')}
                  >
                    Published ({publishedCount})
                  </button>
                  <button
                    type="button"
                    className={`cms-tab-btn ${filter === 'drafts' ? 'active' : ''}`}
                    onClick={() => setFilter('drafts')}
                  >
                    Drafts ({draftCount})
                  </button>
                  <button
                    type="button"
                    className={`cms-tab-btn ${filter === 'live' ? 'active' : ''}`}
                    onClick={() => setFilter('live')}
                  >
                    Live ({liveCount})
                  </button>
                </div>
              </div>

              <div className="sessions-cards-stack">
                {filteredSessions.length ? (
                  filteredSessions.map((session) => {
                    const isLive = session.management_status === 'LIVE'
                    const isPublished = session.is_published

                    return (
                      <AccordionCard
                        key={session.id}
                        header={
                          <div className="session-card-header-grid">
                            <div className="session-card-icon-col">
                              {isLive ? (
                                <span className="session-live-pulse">
                                  <Radio size={16} />
                                </span>
                              ) : (
                                <span className="session-cal-icon">
                                  <CalendarDays size={16} />
                                </span>
                              )}
                            </div>

                            <div className="session-card-main-col">
                              <div className="session-card-title-row">
                                <strong className="session-card-title">{session.title}</strong>
                                <span className="session-tag-chip">{session.bootcamp_tag}</span>
                              </div>
                              <div className="session-card-meta-row">
                                <span className="session-card-time">
                                  <Clock size={12} />
                                  {displayDate(session.starts_at, session.timezone)} ({formatDuration(session.starts_at, session.ends_at)})
                                </span>
                                {session.href && session.href !== '/' && (
                                  <span className="session-card-link-preview">
                                    <Video size={12} /> Meet Link
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="session-card-badges-col">
                              <span
                                className={`session-status-badge ${
                                  isLive
                                    ? 'session-status-badge--live'
                                    : isPublished
                                    ? 'session-status-badge--published'
                                    : 'session-status-badge--draft'
                                }`}
                              >
                                {isLive ? '● Live' : isPublished ? 'Published' : 'Draft'}
                              </span>
                              <span className="session-status-badge session-status-badge--outline">
                                {session.management_status}
                              </span>
                            </div>
                          </div>
                        }
                      >
                        <div className="session-accordion-content-box">
                          <div className="session-accordion-toolbar">
                            <span className="session-toolbar-label">Edit Session Parameters</span>
                            {session.href && session.href !== '/' && (
                              <a
                                href={session.href}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-secondary-button"
                                style={{ fontSize: '12px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <ExternalLink size={12} /> Open Meeting
                              </a>
                            )}
                          </div>

                          <SessionFields
                            session={session}
                            isEdit={true}
                          />

                          <div className="session-danger-zone">
                            <div className="session-danger-text">
                              <strong>Permanent Deletion</strong>
                              <p>Removing this session will cascade delete all registrations and attendance logs.</p>
                            </div>
                            <form action={deleteManagedSession} className="session-danger-form">
                              <input type="hidden" name="id" value={session.id} />
                              <button
                                className="admin-danger-button"
                                type="submit"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Trash2 size={13} /> Delete Session
                              </button>
                            </form>
                          </div>
                        </div>
                      </AccordionCard>
                    )
                  })
                ) : (
                  <div className="cms-empty-state">
                    <div className="cms-empty-icon">
                      <Calendar size={24} />
                    </div>
                    <h4 className="cms-empty-title">No Sessions Match Criteria</h4>
                    <p className="cms-empty-subtitle">
                      Try adjusting your filter or create a new session using the form.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 2. Time Management: Main Client Component ─────────────────────────────
export function TimeManagementClient({
  sessions,
}: {
  sessions: PortalSession[]
}) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || '')
  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) || sessions[0],
    [sessions, selectedSessionId]
  )

  const liveSession = sessions.find((s) => s.management_status === 'LIVE')
  const nextUpcoming = sessions.find((s) => s.management_status === 'UPCOMING')

  return (
    <div className="time-management-workspace">
      {/* Top HUD Card */}
      {(liveSession || nextUpcoming) && (
        <div className="time-hud-card">
          <div className="time-hud-card__head">
            <div className="time-hud-icon-wrap">
              <Radio size={18} className={liveSession ? 'text-red-400' : 'text-blue-400'} />
            </div>
            <div>
              <span className="time-hud-kicker">
                {liveSession ? 'Live Session Operations' : 'Next Scheduled Session'}
              </span>
              <h3 className="time-hud-title">
                {(liveSession || nextUpcoming)?.title}
              </h3>
              <p className="time-hud-meta">
                {displayDate((liveSession || nextUpcoming)!.starts_at, (liveSession || nextUpcoming)!.timezone)} · Attendance{' '}
                {(liveSession || nextUpcoming)!.attendance_open ? 'OPEN' : 'CLOSED'}
              </p>
            </div>
          </div>

          <div className="time-hud-actions">
            {liveSession ? (
              <form action={extendManagedSession} className="time-quick-extend-form">
                <input type="hidden" name="id" value={liveSession.id} />
                <span className="time-quick-label">Extend Live:</span>
                <div className="time-quick-chips">
                  <button name="minutes" value={15} type="submit" className="time-chip-btn">+15 min</button>
                  <button name="minutes" value={30} type="submit" className="time-chip-btn">+30 min</button>
                  <button name="minutes" value={60} type="submit" className="time-chip-btn">+60 min</button>
                </div>
              </form>
            ) : nextUpcoming ? (
              <form action={quickStartManagedSession} className="time-quick-start-form">
                <input type="hidden" name="id" value={nextUpcoming.id} />
                <span className="time-quick-label">Quick Launch Live:</span>
                <div className="time-quick-chips">
                  <button name="durationMinutes" value={30} type="submit" className="time-chip-btn time-chip-btn--primary">Start 30m</button>
                  <button name="durationMinutes" value={60} type="submit" className="time-chip-btn time-chip-btn--primary">Start 60m</button>
                  <button name="durationMinutes" value={90} type="submit" className="time-chip-btn time-chip-btn--primary">Start 90m</button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {/* 2-Column Split: Form on Left, Timeline List on Right */}
      <div className="cms-split-grid" style={{ marginTop: '16px' }}>
        {/* Left Column: Timing & Attendance Window Settings Form */}
        <div className="cms-form-col">
          <div className="cms-form-card">
            <div className="cms-form-card__head">
              <div className="cms-form-icon-wrap">
                <CalendarClock size={16} />
              </div>
              <div>
                <h3 className="cms-form-title">Timing &amp; Check-in Window</h3>
                <p className="cms-form-subtitle">Configure session schedule and verification windows</p>
              </div>
            </div>

            <div className="cms-form-card__body">
              {sessions.length === 0 ? (
                <p className="admin-empty">No sessions created yet. Create a session first in Online Sessions.</p>
              ) : (
                <form action={updateManagedTiming} className="cms-editor-form">
                  <div className="cms-form-group">
                    <AdminCombobox
                      name="id"
                      label="Select Target Session"
                      value={selectedSessionId}
                      onChange={setSelectedSessionId}
                      options={sessions.map((s) => ({
                        value: s.id,
                        label: `${s.title} (${s.management_status})`,
                      }))}
                      placeholder="Select target session…"
                      required
                    />
                  </div>

                  {selectedSession && (
                    <>
                      <div className="cms-form-row">
                        <div className="cms-form-group">
                          <label className="cms-form-label">
                            <span>Session Start <strong className="cms-required">*</strong></span>
                            <input
                              key={`${selectedSession.id}-start`}
                              name="startsAt"
                              type="datetime-local"
                              required
                              defaultValue={utcToZonedLocalInput(selectedSession.starts_at, selectedSession.timezone)}
                              className="cms-form-input"
                            />
                          </label>
                        </div>

                        <div className="cms-form-group">
                          <label className="cms-form-label">
                            <span>Session End <strong className="cms-required">*</strong></span>
                            <input
                              key={`${selectedSession.id}-end`}
                              name="endsAt"
                              type="datetime-local"
                              required
                              defaultValue={selectedSession.ends_at ? utcToZonedLocalInput(selectedSession.ends_at, selectedSession.timezone) : ''}
                              className="cms-form-input"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="cms-form-row">
                        <div className="cms-form-group">
                          <label className="cms-form-label">
                            <span>Timezone</span>
                            <input
                              key={`${selectedSession.id}-tz`}
                              name="timezone"
                              required
                              defaultValue={selectedSession.timezone || defaultTimezone}
                              className="cms-form-input"
                            />
                          </label>
                        </div>

                        <div className="cms-form-group">
                          <AdminCombobox
                            key={`${selectedSession.id}-st`}
                            name="managementStatus"
                            label="Lifecycle Status"
                            defaultValue={selectedSession.management_status}
                            options={[
                              { value: 'DRAFT', label: 'Draft' },
                              { value: 'UPCOMING', label: 'Upcoming' },
                              { value: 'LIVE', label: 'Live' },
                              { value: 'COMPLETED', label: 'Completed' },
                              { value: 'CANCELLED', label: 'Cancelled' },
                              { value: 'ARCHIVED', label: 'Archived' },
                            ]}
                            placeholder="Select status…"
                          />
                        </div>
                      </div>

                      <div className="cms-form-group">
                        <AdminCombobox
                          key={`${selectedSession.id}-attmode`}
                          name="attendanceMode"
                          label="Attendance Verification Window Mode"
                          defaultValue={
                            !selectedSession.attendance_open
                              ? 'closed'
                              : (selectedSession.attendance_starts_at && selectedSession.attendance_ends_at &&
                                 selectedSession.attendance_starts_at === selectedSession.starts_at &&
                                 selectedSession.attendance_ends_at === selectedSession.ends_at)
                              ? 'session'
                              : selectedSession.attendance_starts_at
                              ? 'custom'
                              : 'open'
                          }
                          options={[
                            { value: 'session', label: 'Match Exact Session Time' },
                            { value: 'custom', label: 'Custom Date / Time Window' },
                            { value: 'open', label: 'Always Open' },
                            { value: 'closed', label: 'Closed' },
                          ]}
                          placeholder="Select window mode…"
                        />
                      </div>

                      <div className="cms-form-row">
                        <div className="cms-form-group">
                          <label className="cms-form-label">
                            <span>Custom Window Start</span>
                            <input
                              key={`${selectedSession.id}-attstart`}
                              name="attendanceStartsAt"
                              type="datetime-local"
                              defaultValue={selectedSession.attendance_starts_at ? utcToZonedLocalInput(selectedSession.attendance_starts_at, selectedSession.timezone) : ''}
                              className="cms-form-input"
                            />
                          </label>
                        </div>

                        <div className="cms-form-group">
                          <label className="cms-form-label">
                            <span>Custom Window End</span>
                            <input
                              key={`${selectedSession.id}-attend`}
                              name="attendanceEndsAt"
                              type="datetime-local"
                              defaultValue={selectedSession.attendance_ends_at ? utcToZonedLocalInput(selectedSession.attendance_ends_at, selectedSession.timezone) : ''}
                              className="cms-form-input"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="cms-checkbox-grid">
                        <label className="cms-checkbox-label">
                          <input
                            key={`${selectedSession.id}-regopen`}
                            type="checkbox"
                            name="registrationOpen"
                            defaultChecked={selectedSession.registration_open}
                          />
                          <span className="cms-checkbox-custom" />
                          <span className="cms-checkbox-text">
                            <strong>Registration Active</strong>
                          </span>
                        </label>

                        <label className="cms-checkbox-label">
                          <input
                            key={`${selectedSession.id}-attopen`}
                            type="checkbox"
                            name="attendanceOpen"
                            defaultChecked={selectedSession.attendance_open}
                          />
                          <span className="cms-checkbox-custom" />
                          <span className="cms-checkbox-text">
                            <strong>Attendance Open</strong>
                          </span>
                        </label>
                      </div>

                      <div className="cms-form-actions">
                        <button className="admin-primary-button" type="submit">
                          <Check size={14} /> Save Schedule &amp; Window
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sessions Schedule Cards */}
        <div className="cms-records-col">
          <div className="cms-records-card">
            <div className="cms-records-card__head">
              <div className="cms-records-title-wrap">
                <h3 className="cms-records-title">Session Timing Schedule</h3>
                <span className="cms-records-count">{sessions.length} sessions configured</span>
              </div>
            </div>

            <div className="session-timing-stack" style={{ padding: '14px' }}>
              {sessions.map((session) => (
                <AccordionCard
                  key={session.id}
                  header={
                    <div className="session-card-header-grid">
                      <div className="session-card-icon-col">
                        <span className="session-cal-icon">
                          <CalendarClock size={16} />
                        </span>
                      </div>
                      <div className="session-card-main-col">
                        <strong className="session-card-title">{session.title}</strong>
                        <div className="session-card-meta-row">
                          <span>{displayDate(session.starts_at, session.timezone)}</span>
                          <span>→</span>
                          <span>{displayDate(session.ends_at, session.timezone)}</span>
                        </div>
                      </div>
                      <div className="session-card-badges-col">
                        <span
                          className={`session-status-badge ${
                            session.attendance_open
                              ? 'session-status-badge--live'
                              : 'session-status-badge--outline'
                          }`}
                        >
                          Attendance: {session.attendance_open ? 'Open' : 'Closed'}
                        </span>
                        <span className="session-status-badge session-status-badge--published">
                          {session.management_status}
                        </span>
                      </div>
                    </div>
                  }
                >
                  <div className="timing-editor-box">
                    <form action={updateManagedTiming} className="cms-editor-form">
                      <input type="hidden" name="id" value={session.id} />

                      <div className="cms-form-row">
                        <div className="cms-form-group">
                          <label className="cms-form-label">
                            <span>Session Start</span>
                            <input
                              name="startsAt"
                              type="datetime-local"
                              required
                              defaultValue={utcToZonedLocalInput(session.starts_at, session.timezone)}
                              className="cms-form-input"
                            />
                          </label>
                        </div>

                        <div className="cms-form-group">
                          <label className="cms-form-label">
                            <span>Session End</span>
                            <input
                              name="endsAt"
                              type="datetime-local"
                              required
                              defaultValue={session.ends_at ? utcToZonedLocalInput(session.ends_at, session.timezone) : ''}
                              className="cms-form-input"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="cms-form-row">
                        <div className="cms-form-group">
                          <label className="cms-form-label">
                            <span>Timezone</span>
                            <input
                              name="timezone"
                              required
                              defaultValue={session.timezone || defaultTimezone}
                              className="cms-form-input"
                            />
                          </label>
                        </div>

                        <div className="cms-form-group">
                          <AdminCombobox
                            name="managementStatus"
                            label="Lifecycle Status"
                            defaultValue={session.management_status}
                            options={[
                              { value: 'DRAFT', label: 'Draft' },
                              { value: 'UPCOMING', label: 'Upcoming' },
                              { value: 'LIVE', label: 'Live' },
                              { value: 'COMPLETED', label: 'Completed' },
                              { value: 'CANCELLED', label: 'Cancelled' },
                              { value: 'ARCHIVED', label: 'Archived' },
                            ]}
                            placeholder="Select status…"
                          />
                        </div>
                      </div>

                      <div className="cms-form-row">
                        <div className="cms-form-group">
                          <AdminCombobox
                            name="attendanceMode"
                            label="Attendance Status"
                            defaultValue={session.attendance_open ? 'open' : 'closed'}
                            options={[
                              { value: 'open', label: 'Attendance Open' },
                              { value: 'closed', label: 'Attendance Closed' },
                              { value: 'session', label: 'Match Exact Session Time' },
                              { value: 'custom', label: 'Custom Date / Time Window' },
                            ]}
                            placeholder="Select attendance mode…"
                          />
                        </div>
                      </div>

                      <div className="cms-form-actions">
                        <button className="admin-primary-button" type="submit">
                          <Check size={14} /> Save Schedule &amp; Window
                        </button>
                      </div>
                    </form>

                    <div className="timing-quick-box">
                      <span className="timing-quick-heading">Live Controls</span>
                      <div className="timing-quick-actions-row">
                        <form action={quickStartManagedSession} className="timing-inline-form">
                          <input type="hidden" name="id" value={session.id} />
                          <input name="durationMinutes" type="hidden" value={60} />
                          <button className="admin-secondary-button" type="submit">
                            <Radio size={13} /> Quick Start 60m
                          </button>
                        </form>

                        <form action={extendManagedSession} className="timing-inline-form">
                          <input type="hidden" name="id" value={session.id} />
                          <input name="minutes" type="hidden" value={30} />
                          <button className="admin-secondary-button" type="submit">
                            <Clock size={13} /> Extend 30m
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </AccordionCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 3. Attendance Management: Main Client Component ────────────────────────
export function AttendanceManagementClient({
  sessions,
  records,
  people,
  sessionTitles,
  q = '',
  error = false,
}: {
  sessions: PortalSession[]
  records: AttendanceRow[]
  people: Map<string, { name: string; email: string }>
  sessionTitles: Map<string, string>
  q?: string
  error?: boolean
}) {
  const manualOverridesCount = records.filter((r) => r.method === 'manual-override').length

  return (
    <div className="attendance-workspace">
      {/* Top Metric Strip */}
      <div className="cms-stats-grid">
        <div className="cms-stat-card">
          <div className="cms-stat-icon cms-stat-icon--cobalt">
            <ClipboardCheck size={18} />
          </div>
          <div className="cms-stat-info">
            <span className="cms-stat-label">Verified Attendance</span>
            <strong className="cms-stat-value">{records.length}</strong>
          </div>
        </div>

        <div className="cms-stat-card">
          <div className="cms-stat-icon cms-stat-icon--green">
            <CalendarDays size={18} />
          </div>
          <div className="cms-stat-info">
            <span className="cms-stat-label">Active Sessions</span>
            <strong className="cms-stat-value">{sessions.length}</strong>
          </div>
        </div>

        <div className="cms-stat-card">
          <div className="cms-stat-icon cms-stat-icon--amber">
            <ShieldCheck size={18} />
          </div>
          <div className="cms-stat-info">
            <span className="cms-stat-label">Manual Overrides</span>
            <strong className="cms-stat-value">{manualOverridesCount}</strong>
          </div>
        </div>
      </div>

      <div className="cms-split-grid" style={{ marginTop: '16px' }}>
        {/* Left Column: Manual Override Form */}
        <div className="cms-form-col">
          <div className="cms-form-card">
            <div className="cms-form-card__head">
              <div className="cms-form-icon-wrap">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h3 className="cms-form-title">Manual Attendance Override</h3>
                <p className="cms-form-subtitle">Record documented verification for an attendee</p>
              </div>
            </div>

            <div className="cms-form-card__body">
              <form action={markAttendanceOverride} className="cms-editor-form">
                <div className="cms-form-group">
                  <AdminCombobox
                    name="sessionId"
                    label="Target Session"
                    options={sessions.map((s) => ({
                      value: s.id,
                      label: s.title,
                    }))}
                    placeholder="Select a session…"
                    required
                  />
                </div>

                <div className="cms-form-group">
                  <label className="cms-form-label">
                    <span>Registrant Email <strong className="cms-required">*</strong></span>
                    <input
                      name="email"
                      type="email"
                      list="known-attendees-datalist"
                      required
                      maxLength={254}
                      placeholder="attendee@example.com"
                      className="cms-form-input"
                    />
                    <datalist id="known-attendees-datalist">
                      {Array.from(people.values()).slice(0, 50).map((p, idx) => (
                        <option key={`${p.email}-${idx}`} value={p.email}>
                          {p.name ? `${p.name} (${p.email})` : p.email}
                        </option>
                      ))}
                    </datalist>
                  </label>
                </div>

                <div className="cms-form-group">
                  <label className="cms-form-label">
                    <span>Justification Reason (min 10 chars) <strong className="cms-required">*</strong></span>
                    <textarea
                      name="reason"
                      required
                      minLength={10}
                      maxLength={1000}
                      rows={3}
                      placeholder="e.g. Attended live stream with technical check-in issue; verified on Meet logs."
                      className="cms-form-textarea"
                    />
                  </label>
                </div>

                <div className="cms-form-actions">
                  <button className="admin-primary-button" type="submit">
                    <Check size={14} /> Record Manual Attendance
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Attendance Ledger */}
        <div className="cms-records-col">
          <div className="cms-records-card">
            <div className="cms-records-card__head">
              <div className="cms-records-title-wrap">
                <h3 className="cms-records-title">Attendance Records Ledger</h3>
                <span className="cms-records-count">{records.length} records</span>
              </div>

              <div className="cms-head-actions">
                <a
                  className="admin-secondary-button"
                  href="/api/admin/operations-export?type=attendance"
                  download
                  style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={13} /> Export CSV
                </a>
              </div>
            </div>

            <form method="get" className="cms-filter-toolbar" style={{ padding: '12px 16px' }}>
              <input type="hidden" name="view" value="attendance" />
              <div className="cms-filter-search" style={{ width: '100%' }}>
                <Search size={14} className="cms-search-icon" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search attendee by name or email..."
                  className="cms-search-input"
                />
              </div>
            </form>

            <div className="admin-table-wrap">
              {error ? (
                <p role="alert" className="admin-empty">
                  Attendance records could not be loaded. Please verify database connection.
                </p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Session</th>
                      <th>Check-in Time</th>
                      <th>Method &amp; Reason</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => {
                      const person = people.get(rec.registrant_id)
                      const isManual = rec.method === 'manual-override'

                      return (
                        <tr key={rec.id}>
                          <td data-label="Participant">
                            <div className="user-profile-cell">
                              <span className="user-avatar-initial">
                                {person?.name ? person.name.charAt(0).toUpperCase() : 'U'}
                              </span>
                              <div>
                                <strong>{person?.name || 'Unknown'}</strong>
                                <small className="admin-table__subline">{person?.email || '—'}</small>
                              </div>
                            </div>
                          </td>
                          <td data-label="Session">
                            <span className="session-title-tag">
                              {sessionTitles.get(rec.session_id) || 'Unknown Session'}
                            </span>
                          </td>
                          <td data-label="Check-in Time">
                            <span className="table-time-text">{displayDate(rec.marked_at)}</span>
                          </td>
                          <td data-label="Method">
                            <span className={`audit-badge ${isManual ? 'audit-badge--amber' : 'audit-badge--green'}`}>
                              {isManual ? 'Manual Override' : 'QR / Verified'}
                            </span>
                            {rec.override_reason && (
                              <small className="admin-table__subline" style={{ display: 'block', marginTop: '3px' }}>
                                {rec.override_reason}
                              </small>
                            )}
                          </td>
                          <td data-label="Actions" style={{ textAlign: 'right' }}>
                            {isManual ? (
                              <form action={removeManualAttendance} className="cms-inline-del-form">
                                <input type="hidden" name="id" value={rec.id} />
                                <button className="cms-row-delete-btn" type="submit" title="Remove manual override">
                                   <Trash2 size={13} />
                                </button>
                              </form>
                            ) : (
                              <span style={{ opacity: 0.3 }}>—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              {!error && !records.length && (
                <div className="cms-empty-state">
                  <div className="cms-empty-icon">
                    <ClipboardCheck size={24} />
                  </div>
                  <h4 className="cms-empty-title">No Attendance Records</h4>
                  <p className="cms-empty-subtitle">Check-in submissions will populate here in real-time.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 4. Registrants Management: Main Client Component ───────────────────────
export function RegistrantsManagementClient({
  registrants,
  count,
  attendanceLen,
  registrationCounts,
  attendanceCounts,
  q = '',
  error = false,
}: {
  registrants: RegistrantRow[]
  count: number
  attendanceLen: number
  registrationCounts: Map<string, number>
  attendanceCounts: Map<string, number>
  q?: string
  error?: boolean
}) {
  const conversionRate = count > 0 ? Math.min(100, Math.round((attendanceLen / count) * 100)) : 0

  return (
    <div className="registrants-workspace">
      {/* Redesigned Cyber KPI Stats Bar */}
      <div className="registrants-cyber-stats-grid">
        <div className="cyber-kpi-card cyber-kpi-card--cobalt">
          <div className="cyber-kpi-card__top">
            <span className="cyber-kpi-badge cyber-kpi-badge--cobalt">Community</span>
            <div className="cyber-kpi-icon">
              <Users size={16} />
            </div>
          </div>
          <div className="cyber-kpi-card__main">
            <span className="cyber-kpi-label">Total Registered</span>
            <strong className="cyber-kpi-value">{count.toLocaleString()}</strong>
          </div>
          <div className="cyber-kpi-card__footer">
            <span className="cyber-kpi-subtext">Verified community database</span>
          </div>
        </div>

        <div className="cyber-kpi-card cyber-kpi-card--emerald">
          <div className="cyber-kpi-card__top">
            <span className="cyber-kpi-badge cyber-kpi-badge--emerald">Active Batch</span>
            <div className="cyber-kpi-icon">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="cyber-kpi-card__main">
            <span className="cyber-kpi-label">Roster in View</span>
            <strong className="cyber-kpi-value">{registrants.length}</strong>
          </div>
          <div className="cyber-kpi-card__footer">
            <span className="cyber-kpi-subtext">{q ? `Filtered by "${q}"` : 'Active pagination batch'}</span>
          </div>
        </div>

        <div className="cyber-kpi-card cyber-kpi-card--purple">
          <div className="cyber-kpi-card__top">
            <span className="cyber-kpi-badge cyber-kpi-badge--purple">Audit Verified</span>
            <div className="cyber-kpi-icon">
              <ClipboardCheck size={16} />
            </div>
          </div>
          <div className="cyber-kpi-card__main">
            <span className="cyber-kpi-label">Verified Check-ins</span>
            <strong className="cyber-kpi-value">{attendanceLen.toLocaleString()}</strong>
          </div>
          <div className="cyber-kpi-card__footer">
            <span className="cyber-kpi-subtext">Session attendance records</span>
          </div>
        </div>

        <div className="cyber-kpi-card cyber-kpi-card--amber">
          <div className="cyber-kpi-card__top">
            <span className="cyber-kpi-badge cyber-kpi-badge--amber">Engagement</span>
            <div className="cyber-kpi-icon">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="cyber-kpi-card__main">
            <span className="cyber-kpi-label">Conversion Ratio</span>
            <strong className="cyber-kpi-value">{conversionRate}%</strong>
          </div>
          <div className="cyber-kpi-card__footer">
            <span className="cyber-kpi-subtext">Attendance to registration ratio</span>
          </div>
        </div>
      </div>

      <div className="cms-records-card" style={{ marginTop: '16px' }}>
        <div className="cms-records-card__head">
          <div className="cms-records-title-wrap">
            <h3 className="cms-records-title">Registered Participants Directory</h3>
            <span className="cms-records-count">{count} total members</span>
          </div>

          <div className="cms-head-actions">
            <a
              className="admin-secondary-button"
              href="/api/admin/operations-export?type=registrants"
              download
              style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={13} /> Export CSV
            </a>
          </div>
        </div>

        <form method="get" className="cms-filter-toolbar" style={{ padding: '12px 16px' }}>
          <input type="hidden" name="view" value="registrants" />
          <div className="cms-filter-search" style={{ width: '100%' }}>
            <Search size={14} className="cms-search-icon" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search participants by name, email, organization, or location..."
              className="cms-search-input"
            />
          </div>
        </form>

        <div className="admin-table-wrap">
          {error ? (
            <p role="alert" className="admin-empty">
              Registrant records could not be loaded.
            </p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Organization</th>
                  <th>Location</th>
                  <th>Sessions Booked</th>
                  <th>Attended</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrants.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Participant">
                      <div className="user-profile-cell">
                        <span className="user-avatar-initial">
                          {p.name ? p.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                        <div>
                          <strong>{p.name || '—'}</strong>
                          <small className="admin-table__subline">{p.email}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="Organization">
                      <span className="org-tag">{p.organization || '—'}</span>
                    </td>
                    <td data-label="Location">{p.country_city || '—'}</td>
                    <td data-label="Booked">
                      <span className="count-badge">{registrationCounts.get(p.id) ?? 0}</span>
                    </td>
                    <td data-label="Attended">
                      <span className="count-badge count-badge--green">{attendanceCounts.get(p.id) ?? 0}</span>
                    </td>
                    <td data-label="Joined">
                      <span className="table-time-text">{displayDate(p.created_at)}</span>
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <form action={deleteRegistrant} className="cms-inline-del-form">
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          className="cms-row-delete-btn"
                          type="submit"
                          title="Delete participant"
                          onClick={(e) => {
                            if (!window.confirm(`Delete registrant "${p.name || p.email}"?`)) {
                              e.preventDefault()
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!error && !registrants.length && (
            <div className="cms-empty-state">
              <div className="cms-empty-icon">
                <Users size={24} />
              </div>
              <h4 className="cms-empty-title">No Registrants Found</h4>
              <p className="cms-empty-subtitle">No participants match your query.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 5. Google Sheets Sync Management Client — REDESIGNED ─────────────────────
export function GoogleSyncManagementClient({
  sessions,
  connections,
  syncRuns,
  isConfigured,
  serviceAccountEmail,
  error,
}: {
  sessions: PortalSession[]
  connections: GoogleConnectionRow[]
  syncRuns: GoogleSyncRunRow[]
  isConfigured: boolean
  serviceAccountEmail: string
  error: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')
  const [showGuide, setShowGuide] = useState(!connections.length)

  function handleCopyEmail() {
    if (!serviceAccountEmail) return
    navigator.clipboard.writeText(serviceAccountEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const sessionByConnection = useMemo(() => {
    const map = new Map<string, PortalSession>()
    for (const s of sessions) {
      if (s.sheet_connection_id) {
        map.set(s.sheet_connection_id, s)
      }
    }
    return map
  }, [sessions])

  const connectionMap = useMemo(() => {
    const map = new Map<string, GoogleConnectionRow>()
    for (const c of connections) {
      map.set(c.id, c)
    }
    return map
  }, [connections])

  const filteredConnections = useMemo(() => {
    if (!search.trim()) return connections
    const q = search.toLowerCase()
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.spreadsheet_id.toLowerCase().includes(q) ||
        c.sheet_name.toLowerCase().includes(q)
    )
  }, [connections, search])

  const activeCount = connections.filter((c) => c.is_active).length
  const totalRuns = syncRuns.length
  const successfulRuns = syncRuns.filter((r) => r.status === 'success').length
  const totalRowsSynced = syncRuns.reduce((sum, r) => sum + r.created_count + r.updated_count, 0)

  return (
    <div className="gsync-redesigned-root">
      {/* ──────── Hero Header with Gradient Accent ──────── */}
      <div className="gsync-hero">
        <div className="gsync-hero-content">
          <div className="gsync-hero-icon-wrap">
            <div className="gsync-hero-icon-glow" />
            <FileSpreadsheet size={22} />
          </div>
          <div className="gsync-hero-text">
            <h2 className="gsync-hero-title">Google Sheets Integration</h2>
            <p className="gsync-hero-subtitle">
              Connect Google Form response spreadsheets and automatically sync registered participants into your session roster.
            </p>
          </div>
        </div>
        <div className="gsync-hero-pills">
          {isConfigured ? (
            <span className="gsync-status-chip gsync-status-chip--connected">
              <CheckCircle2 size={13} />
              <span>API Connected</span>
            </span>
          ) : (
            <span className="gsync-status-chip gsync-status-chip--warning">
              <ShieldAlert size={13} />
              <span>Setup Required</span>
            </span>
          )}
          <span className="gsync-status-chip gsync-status-chip--info">
            <FileSpreadsheet size={13} />
            <span>{connections.length} Sheet{connections.length !== 1 ? 's' : ''}</span>
          </span>
        </div>
      </div>

      {/* ──────── KPI Metrics Dashboard ──────── */}
      <div className="gsync-metrics-grid">
        <div className="gsync-metric-card">
          <div className="gsync-metric-visual gsync-metric-visual--blue">
            <FileSpreadsheet size={18} />
          </div>
          <div className="gsync-metric-data">
            <span className="gsync-metric-number">{connections.length}</span>
            <span className="gsync-metric-label">Connected Sheets</span>
          </div>
          <div className="gsync-metric-footer">
            <span className="gsync-metric-sub">{activeCount} active</span>
          </div>
        </div>

        <div className="gsync-metric-card">
          <div className="gsync-metric-visual gsync-metric-visual--emerald">
            <RefreshCw size={18} />
          </div>
          <div className="gsync-metric-data">
            <span className="gsync-metric-number">{successfulRuns}</span>
            <span className="gsync-metric-label">Successful Syncs</span>
          </div>
          <div className="gsync-metric-footer">
            <span className="gsync-metric-sub">{totalRuns} total runs</span>
          </div>
        </div>

        <div className="gsync-metric-card">
          <div className="gsync-metric-visual gsync-metric-visual--purple">
            <Users size={18} />
          </div>
          <div className="gsync-metric-data">
            <span className="gsync-metric-number">{totalRowsSynced}</span>
            <span className="gsync-metric-label">Rows Processed</span>
          </div>
          <div className="gsync-metric-footer">
            <span className="gsync-metric-sub">Created &amp; updated</span>
          </div>
        </div>

        <div className="gsync-metric-card">
          <div className="gsync-metric-visual gsync-metric-visual--amber">
            <ShieldCheck size={18} />
          </div>
          <div className="gsync-metric-data">
            <span className="gsync-metric-number" style={{ fontSize: '16px' }}>
              {isConfigured ? 'Ready' : 'Pending'}
            </span>
            <span className="gsync-metric-label">API Status</span>
          </div>
          <div className="gsync-metric-footer">
            <span className="gsync-metric-sub">
              {isConfigured ? 'Credentials verified' : 'Needs configuration'}
            </span>
          </div>
        </div>
      </div>

      {/* ──────── Service Account Setup Wizard ──────── */}
      <div className="gsync-setup-card">
        <button
          type="button"
          className="gsync-setup-toggle"
          onClick={() => setShowGuide((v) => !v)}
          aria-expanded={showGuide}
        >
          <div className="gsync-setup-toggle-left">
            <div className="gsync-setup-shield-icon">
              <ShieldCheck size={16} />
            </div>
            <div>
              <span className="gsync-setup-toggle-title">Service Account Setup &amp; Sheet Sharing</span>
              <span className="gsync-setup-toggle-desc">
                {isConfigured
                  ? 'Your Google API credentials are configured. Share sheets with the service account below.'
                  : 'Configure your Google service account credentials to enable sheet syncing.'}
              </span>
            </div>
          </div>
          <div className="gsync-setup-toggle-right">
            {isConfigured ? (
              <span className="gsync-status-chip gsync-status-chip--connected" style={{ fontSize: '10px' }}>
                <CheckCircle2 size={11} /> Configured
              </span>
            ) : (
              <span className="gsync-status-chip gsync-status-chip--warning" style={{ fontSize: '10px' }}>
                <ShieldAlert size={11} /> Setup Needed
              </span>
            )}
            <ChevronDown
              size={16}
              className={`gsync-setup-chevron ${showGuide ? 'gsync-setup-chevron--open' : ''}`}
            />
          </div>
        </button>

        {showGuide && (
          <div className="gsync-setup-body">
            <div className="gsync-setup-email-section">
              <div className="gsync-setup-email-label">
                <ShieldCheck size={14} className="text-blue-400" />
                <span>Google Service Account Email</span>
              </div>
              <div className="gsync-setup-email-row">
                <code className="gsync-setup-email-value">
                  {serviceAccountEmail || 'cgs-service-account@cyberguardian.iam.gserviceaccount.com'}
                </code>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="gsync-setup-copy-btn"
                  title="Copy Service Account Email"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="gsync-setup-steps-grid">
              <div className="gsync-setup-step-card">
                <div className="gsync-setup-step-badge">1</div>
                <div className="gsync-setup-step-content">
                  <strong>Open Google Sheet</strong>
                  <p>Navigate to the Google Form responses spreadsheet you want to connect.</p>
                </div>
              </div>
              <div className="gsync-setup-step-card">
                <div className="gsync-setup-step-badge">2</div>
                <div className="gsync-setup-step-content">
                  <strong>Share with Service Account</strong>
                  <p>Click <strong>Share</strong>, paste the service account email, and grant <strong>Viewer</strong> access.</p>
                </div>
              </div>
              <div className="gsync-setup-step-card">
                <div className="gsync-setup-step-badge">3</div>
                <div className="gsync-setup-step-content">
                  <strong>Connect &amp; Sync</strong>
                  <p>Copy the spreadsheet ID from the URL bar and use the form below to create a new connection.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ──────── Main 2-Column Layout ──────── */}
      <div className="gsync-main-grid">
        {/* Left: Connect New Sheet Form */}
        <div className="gsync-form-panel">
          <div className="gsync-panel-card">
            <div className="gsync-panel-header">
              <div className="gsync-panel-header-icon">
                <Plus size={15} />
              </div>
              <div>
                <h3 className="gsync-panel-title">Connect Google Sheet</h3>
                <p className="gsync-panel-desc">Register a new registration responses spreadsheet</p>
              </div>
            </div>

            <form action={createGoogleConnection} className="gsync-connect-form">
              <div className="gsync-field-group">
                <label className="gsync-field-label">
                  <span>Connection Name <strong className="cms-required">*</strong></span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  maxLength={160}
                  placeholder="e.g. Spring 2026 Bootcamp Registration"
                  className="gsync-field-input"
                />
                <span className="gsync-field-hint">A descriptive name for internal management</span>
              </div>

              <div className="gsync-field-group">
                <label className="gsync-field-label">
                  <span>Spreadsheet ID or URL <strong className="cms-required">*</strong></span>
                </label>
                <input
                  name="spreadsheetId"
                  type="text"
                  required
                  maxLength={200}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="gsync-field-input"
                />
                <span className="gsync-field-hint">
                  Paste the 44-char ID or the full <code>https://docs.google.com/spreadsheets/d/...</code> URL
                </span>
              </div>

              <div className="gsync-field-group">
                <label className="gsync-field-label">
                  <span>Sheet Tab Name</span>
                </label>
                <input
                  name="sheetName"
                  type="text"
                  defaultValue="Form Responses 1"
                  maxLength={300}
                  placeholder="Form Responses 1"
                  className="gsync-field-input"
                />
                <span className="gsync-field-hint">
                  Exact tab name (Google Forms defaults to &quot;Form Responses 1&quot;)
                </span>
              </div>

              <div className="gsync-field-group">
                <AdminCombobox
                  name="sessionId"
                  label="Link to Session (Optional)"
                  defaultValue=""
                  options={[
                    { value: '', label: 'General Roster (No session link)' },
                    ...sessions.map((s) => ({
                      value: s.id,
                      label: `${s.title} (${displayDate(s.starts_at)})`,
                    })),
                  ]}
                  placeholder="Select a session to link…"
                />
              </div>

              <button type="submit" className="gsync-submit-btn">
                <FileSpreadsheet size={15} />
                <span>Connect Spreadsheet</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Connected Sheets Pipeline */}
        <div className="gsync-connections-panel">
          <div className="gsync-panel-card">
            <div className="gsync-panel-header">
              <div className="gsync-panel-header-icon gsync-panel-header-icon--green">
                <FileSpreadsheet size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="gsync-panel-title">Connected Pipelines</h3>
                <p className="gsync-panel-desc">{connections.length} total · {activeCount} active</p>
              </div>
            </div>

            {/* Search */}
            <div className="gsync-connections-search">
              <Search size={14} className="gsync-search-icon" />
              <input
                type="text"
                placeholder="Search by name, sheet ID, or tab…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="gsync-search-input"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="gsync-search-clear">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Error State */}
            {error && (
              <div className="gsync-error-banner">
                <AlertCircle size={14} />
                <span>Google Sheet connections could not be loaded from the database.</span>
              </div>
            )}

            {/* Empty State */}
            {!error && !filteredConnections.length && (
              <div className="gsync-empty-state">
                <div className="gsync-empty-icon">
                  <FileSpreadsheet size={28} />
                </div>
                <h4>No Sheets Connected</h4>
                <p>Add your first Google Form response spreadsheet using the form on the left to start syncing participants.</p>
              </div>
            )}

            {/* Connection Cards */}
            {!error && filteredConnections.length > 0 && (
              <div className="gsync-pipeline-stack">
                {filteredConnections.map((conn) => {
                  const linkedSession = sessionByConnection.get(conn.id)
                  const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${conn.spreadsheet_id}`
                  const runsForThis = syncRuns.filter((r) => r.connection_id === conn.id)
                  const lastRun = runsForThis[0]

                  return (
                    <div
                      key={conn.id}
                      className={`gsync-pipeline-card ${conn.is_active ? 'gsync-pipeline-card--active' : 'gsync-pipeline-card--paused'}`}
                    >
                      {/* Card Header */}
                      <div className="gsync-pipeline-head">
                        <div className="gsync-pipeline-dot-wrap">
                          <span
                            className={`gsync-pipeline-dot ${conn.is_active ? 'gsync-pipeline-dot--active' : 'gsync-pipeline-dot--paused'}`}
                          />
                        </div>
                        <div className="gsync-pipeline-info">
                          <strong className="gsync-pipeline-name">{conn.name}</strong>
                          <div className="gsync-pipeline-meta">
                            <span className="gsync-pipeline-tag">{conn.sheet_name}</span>
                            {linkedSession && (
                              <span className="gsync-pipeline-link">
                                → {linkedSession.title}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="gsync-pipeline-actions-top">
                          <form action={syncGoogleConnectionNow} className="gsync-inline-form">
                            <input type="hidden" name="id" value={conn.id} />
                            <button
                              type="submit"
                              className="gsync-action-btn gsync-action-btn--sync"
                              title="Sync now"
                            >
                              <RefreshCw size={13} />
                              <span>Sync</span>
                            </button>
                          </form>

                          <a
                            href={googleSheetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="gsync-action-btn gsync-action-btn--open"
                            title="Open in Google Sheets"
                          >
                            <ExternalLink size={12} />
                          </a>

                          <span className={`gsync-badge ${conn.is_active ? 'gsync-badge--active' : 'gsync-badge--paused'}`}>
                            {conn.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      </div>

                      {/* Sync Timeline Indicator */}
                      <div className="gsync-pipeline-timeline">
                        <Clock size={11} />
                        <span>
                          Last synced: {conn.last_synced_at ? displayDate(conn.last_synced_at) : 'Never'}
                        </span>
                        {lastRun && (
                          <span className={`gsync-run-status gsync-run-status--${lastRun.status}`}>
                            {lastRun.status === 'success' ? 'OK' : lastRun.status === 'error' ? 'Failed' : 'Running'}
                            {lastRun.status === 'success' && ` (+${lastRun.created_count})`}
                          </span>
                        )}
                      </div>

                      {/* Expandable Edit Form */}
                      <AccordionCard
                        header={
                          <span className="gsync-edit-toggle-label">Edit Connection Configuration</span>
                        }
                      >
                        <form action={updateGoogleConnection} className="gsync-edit-form">
                          <input type="hidden" name="id" value={conn.id} />

                          <div className="gsync-edit-row">
                            <div className="gsync-field-group gsync-field-group--compact">
                              <label className="gsync-field-label">Connection Name</label>
                              <input
                                name="name"
                                type="text"
                                required
                                defaultValue={conn.name}
                                className="gsync-field-input"
                              />
                            </div>
                            <div className="gsync-field-group gsync-field-group--compact">
                              <label className="gsync-field-label">Sheet Tab Name</label>
                              <input
                                name="sheetName"
                                type="text"
                                required
                                defaultValue={conn.sheet_name}
                                className="gsync-field-input"
                              />
                            </div>
                          </div>

                          <div className="gsync-field-group gsync-field-group--compact">
                            <label className="gsync-field-label">Spreadsheet ID</label>
                            <input
                              name="spreadsheetId"
                              type="text"
                              required
                              defaultValue={conn.spreadsheet_id}
                              className="gsync-field-input"
                            />
                          </div>

                          <div className="gsync-field-group gsync-field-group--compact">
                            <AdminCombobox
                              name="sessionId"
                              label="Linked Session"
                              defaultValue={linkedSession?.id || ''}
                              options={[
                                { value: '', label: 'None (General Roster)' },
                                ...sessions.map((s) => ({
                                  value: s.id,
                                  label: `${s.title} (${displayDate(s.starts_at)})`,
                                })),
                              ]}
                              placeholder="Select linked session…"
                            />
                          </div>

                          <div className="gsync-edit-actions">
                            <button type="submit" className="gsync-action-btn gsync-action-btn--save">
                              <Check size={13} />
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </form>

                        <div className="gsync-edit-secondary-actions">
                          <form action={setGoogleConnectionActive} className="gsync-inline-form">
                            <input type="hidden" name="id" value={conn.id} />
                            <input type="hidden" name="isActive" value={conn.is_active ? 'false' : 'true'} />
                            <button type="submit" className="gsync-action-btn gsync-action-btn--toggle">
                              {conn.is_active ? 'Pause' : 'Resume'}
                            </button>
                          </form>

                          <form action={deleteGoogleConnection} className="gsync-inline-form">
                            <input type="hidden" name="id" value={conn.id} />
                            <button
                              type="submit"
                              className="gsync-action-btn gsync-action-btn--delete"
                              title="Delete connection"
                              onClick={(e) => {
                                if (!window.confirm(`Delete Google Sheet connection "${conn.name}"? Previously synced participants will not be deleted.`)) {
                                  e.preventDefault()
                                }
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </form>
                        </div>
                      </AccordionCard>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────── Sync Audit Activity Log ──────── */}
      <div className="gsync-audit-card">
        <div className="gsync-audit-header">
          <div className="gsync-audit-header-left">
            <RefreshCw size={16} className="text-blue-400" />
            <div>
              <h3 className="gsync-audit-title">Synchronization Audit Log</h3>
              <span className="gsync-audit-count">{syncRuns.length} recent runs</span>
            </div>
          </div>
        </div>

        <div className="admin-table-wrap">
          {!syncRuns.length ? (
            <div className="gsync-empty-state" style={{ padding: '32px' }}>
              <div className="gsync-empty-icon">
                <RefreshCw size={28} />
              </div>
              <h4>No Sync Runs Recorded</h4>
              <p>Click &quot;Sync&quot; on any connected sheet to fetch responses and populate this log.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Google Sheet</th>
                  <th>Finished</th>
                  <th>Rows Read</th>
                  <th>New</th>
                  <th>Updated</th>
                  <th>Skipped</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {syncRuns.map((run) => {
                  const conn = run.connection_id ? connectionMap.get(run.connection_id) : undefined
                  const isSuccess = run.status === 'success'
                  const isError = run.status === 'error'

                  return (
                    <tr key={run.id}>
                      <td data-label="Status">
                        <span className={`gsync-run-badge gsync-run-badge--${run.status}`}>
                          {isSuccess ? '✓ Success' : isError ? '✗ Error' : '⟳ Running'}
                        </span>
                      </td>
                      <td data-label="Sheet">
                        <strong>{conn ? conn.name : 'Unknown'}</strong>
                      </td>
                      <td data-label="Finished">
                        <span className="table-time-text">{displayDate(run.finished_at || run.started_at)}</span>
                      </td>
                      <td data-label="Rows">
                        <span className="count-badge">{run.rows_read}</span>
                      </td>
                      <td data-label="New">
                        <span className="count-badge count-badge--green">+{run.created_count}</span>
                      </td>
                      <td data-label="Updated">
                        <span className="count-badge">{run.updated_count}</span>
                      </td>
                      <td data-label="Skipped">
                        <span className="table-time-text">{run.duplicate_count + run.invalid_count}</span>
                      </td>
                      <td data-label="Details">
                        {run.error_message ? (
                          <span className="gsync-error-text">{run.error_message}</span>
                        ) : (
                          <span className="gsync-ok-text">Sync verified</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
