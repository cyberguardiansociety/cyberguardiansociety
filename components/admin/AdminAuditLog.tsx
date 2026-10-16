'use client'

import { Fragment, useState, useMemo } from 'react'
import {
  ShieldCheck,
  Search,
  Filter,
  User,
  UserCheck,
  FileText,
  Calendar,
  Layers,
  Inbox,
  Clock,
  ChevronDown,
  ChevronRight,
  Download,
  Terminal,
  Activity,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit,
  PlusCircle,
  RefreshCw,
} from 'lucide-react'
import AdminCombobox from '@/components/admin/AdminCombobox'
import { clearAllAuditLogs } from '@/app/admin/audit-actions'

export type AuditLogEntry = {
  id?: string | number
  actor_id: string | null
  action: string
  entity: string
  entity_id: string | null
  details: Record<string, any> | null
  created_at: string
}

type Props = {
  initialEntries: AuditLogEntry[]
  currentAdminEmail?: string
  canClearAuditLogs?: boolean
}

function formatUtc(value: string) {
  try {
    const d = new Date(value)
    return `${new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'UTC',
    }).format(d)} UTC`
  } catch {
    return value
  }
}

function formatRelative(value: string) {
  try {
    const d = new Date(value)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diffSec < 60) return `${diffSec}s ago`
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    return `${Math.floor(diffSec / 86400)}d ago`
  } catch {
    return ''
  }
}

export default function AdminAuditLog({ initialEntries, currentAdminEmail, canClearAuditLogs = false }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'user' | 'admin' | 'content' | 'sessions' | 'inbox'>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  // Classify entry
  const isUserSubmission = (entry: AuditLogEntry) => {
    return (
      entry.action.includes('submitted') ||
      entry.action.includes('checkin') ||
      entry.action === 'membership_interest_submitted' ||
      entry.action === 'application_submitted' ||
      entry.action === 'speaker_application_submitted' ||
      entry.action === 'contact_message_submitted' ||
      entry.action === 'attendance_checkin' ||
      !entry.actor_id
    )
  }

  // Filter entries
  const filteredEntries = useMemo(() => {
    return initialEntries.filter((entry) => {
      // Category filter
      if (categoryFilter === 'user' && !isUserSubmission(entry)) return false
      if (categoryFilter === 'admin' && isUserSubmission(entry)) return false
      if (categoryFilter === 'content' && !entry.entity.includes('managed_content') && !entry.entity.includes('product') && !entry.entity.includes('merch') && !entry.entity.includes('resource') && !entry.entity.includes('announcement')) return false
      if (categoryFilter === 'sessions' && !entry.entity.includes('session') && !entry.entity.includes('speaker') && !entry.entity.includes('attendance') && !entry.entity.includes('registrant')) return false
      if (categoryFilter === 'inbox' && !entry.entity.includes('inbox') && !entry.entity.includes('application') && !entry.entity.includes('contact')) return false

      // Action filter
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchAction = entry.action.toLowerCase().includes(query)
        const matchEntity = entry.entity.toLowerCase().includes(query)
        const matchRecord = entry.entity_id ? entry.entity_id.toLowerCase().includes(query) : false
        const matchActor = entry.actor_id ? entry.actor_id.toLowerCase().includes(query) : false
        const matchDetails = entry.details ? JSON.stringify(entry.details).toLowerCase().includes(query) : false

        if (!matchAction && !matchEntity && !matchRecord && !matchActor && !matchDetails) {
          return false
        }
      }

      return true
    })
  }, [initialEntries, searchTerm, categoryFilter, actionFilter])

  // Aggregate stats
  const stats = useMemo(() => {
    const total = initialEntries.length
    let userEvents = 0
    let adminEvents = 0
    let contentEvents = 0
    let sessionEvents = 0

    for (const e of initialEntries) {
      if (isUserSubmission(e)) userEvents++
      else adminEvents++

      if (e.entity.includes('managed_content')) contentEvents++
      if (e.entity.includes('session') || e.entity.includes('speaker') || e.entity.includes('attendance')) sessionEvents++
    }

    return { total, userEvents, adminEvents, contentEvents, sessionEvents }
  }, [initialEntries])

  // Unique actions for dropdown
  const uniqueActions = useMemo(() => {
    const set = new Set<string>()
    initialEntries.forEach((e) => set.add(e.action))
    return Array.from(set).sort()
  }, [initialEntries])

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp_UTC', 'Actor_Type', 'Actor_ID', 'Action', 'Entity', 'Entity_ID', 'Details']
    const rows = filteredEntries.map((e) => [
      e.created_at,
      isUserSubmission(e) ? 'User/Public' : 'Admin',
      e.actor_id || 'Public/Guest',
      e.action,
      e.entity,
      e.entity_id || '',
      e.details ? JSON.stringify(e.details).replace(/"/g, '""') : '',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      headers.join(','),
      ...rows.map((r) => r.map((field) => `"${field}"`).join(',')),
    ].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `cgs_audit_log_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getActionBadge = (action: string) => {
    if (action.includes('submitted') || action.includes('create') || action.includes('checkin')) {
      return <span className="audit-badge audit-badge--green"><PlusCircle size={11} /> {action}</span>
    }
    if (action.includes('delete') || action.includes('remove') || action.includes('clear')) {
      return <span className="audit-badge audit-badge--red"><Trash2 size={11} /> {action}</span>
    }
    if (action.includes('update') || action.includes('save') || action.includes('sync')) {
      return <span className="audit-badge audit-badge--blue"><RefreshCw size={11} /> {action}</span>
    }
    if (action.includes('override') || action.includes('quick_start') || action.includes('status')) {
      return <span className="audit-badge audit-badge--amber"><Edit size={11} /> {action}</span>
    }
    return <span className="audit-badge audit-badge--default">{action}</span>
  }

  return (
    <div className="audit-management-workspace">
      {/* ── KPI Stats Strip ── */}
      <div className="cms-stats-grid">
        <div className="cms-stat-card">
          <div className="cms-stat-icon cms-stat-icon--cobalt">
            <Activity size={18} />
          </div>
          <div className="cms-stat-info">
            <span className="cms-stat-label">Total Logged Events</span>
            <strong className="cms-stat-value">{stats.total}</strong>
          </div>
        </div>

        <div className="cms-stat-card">
          <div className="cms-stat-icon cms-stat-icon--green">
            <User size={18} />
          </div>
          <div className="cms-stat-info">
            <span className="cms-stat-label">User Submissions</span>
            <strong className="cms-stat-value">{stats.userEvents}</strong>
          </div>
        </div>

        <div className="cms-stat-card">
          <div className="cms-stat-icon cms-stat-icon--purple">
            <UserCheck size={18} />
          </div>
          <div className="cms-stat-info">
            <span className="cms-stat-label">Admin Actions</span>
            <strong className="cms-stat-value">{stats.adminEvents}</strong>
          </div>
        </div>

        <div className="cms-stat-card">
          <div className="cms-stat-icon cms-stat-icon--amber">
            <Layers size={18} />
          </div>
          <div className="cms-stat-info">
            <span className="cms-stat-label">Content Changes</span>
            <strong className="cms-stat-value">{stats.contentEvents}</strong>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="cms-records-card">
        <div className="cms-records-card__head">
          <div className="cms-records-title-wrap">
            <h3 className="cms-records-title">Platform Audit Trail</h3>
            <span className="cms-records-count">{filteredEntries.length} events logged</span>
          </div>

          <div className="cms-head-actions">
            <button
              type="button"
              onClick={handleExportCSV}
              className="admin-secondary-button"
              style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={13} /> Export CSV
            </button>
            {canClearAuditLogs ? (
              <button
                type="button"
                className="admin-danger-button audit-delete-toggle"
                aria-expanded={showDeleteConfirmation}
                aria-controls={showDeleteConfirmation ? 'audit-delete-confirmation-panel' : undefined}
                onClick={() => {
                  setShowDeleteConfirmation((open) => !open)
                  setDeleteConfirmation('')
                }}
              >
                <Trash2 size={13} /> {showDeleteConfirmation ? 'Cancel' : 'Delete all logs'}
              </button>
            ) : null}
          </div>
        </div>

        {canClearAuditLogs && showDeleteConfirmation ? (
          <form
            id="audit-delete-confirmation-panel"
            action={clearAllAuditLogs}
            className="settings-danger-action audit-delete-confirmation"
          >
            <div>
              <h3>Delete every audit log</h3>
              <p>This permanently removes all recorded platform activity. This action cannot be undone.</p>
            </div>
            <label htmlFor="audit-delete-confirmation-input">
              <span>Type <code>DELETE ALL AUDIT LOGS</code> to confirm:</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                <input
                  id="audit-delete-confirmation-input"
                  name="confirmation"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder="DELETE ALL AUDIT LOGS"
                  autoComplete="off"
                  required
                  spellCheck={false}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setDeleteConfirmation('DELETE ALL AUDIT LOGS')}
                  className="admin-secondary-button"
                  style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap' }}
                  title="Auto-fill confirmation text"
                >
                  Quick Fill
                </button>
              </div>
            </label>
            <button
              className="admin-danger-button"
              type="submit"
              disabled={deleteConfirmation.trim().toUpperCase() !== 'DELETE ALL AUDIT LOGS'}
              style={{ marginTop: '8px' }}
            >
              <Trash2 size={13} /> Permanently delete logs
            </button>
          </form>
        ) : null}

        <div className="cms-filter-toolbar">
          <div className="cms-filter-search">
            <Search size={14} className="cms-search-icon" />
            <input
              type="text"
              placeholder="Search action, entity, email, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cms-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="cms-search-clear"
              >
                ×
              </button>
            )}
          </div>

          <div className="cms-filter-group">
            <div className="cms-category-tabs">
              <button
                type="button"
                className={`cms-tab-btn ${categoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('all')}
              >
                All Events
              </button>
              <button
                type="button"
                className={`cms-tab-btn ${categoryFilter === 'user' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('user')}
              >
                User Submissions
              </button>
              <button
                type="button"
                className={`cms-tab-btn ${categoryFilter === 'admin' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('admin')}
              >
                Admin Actions
              </button>
              <button
                type="button"
                className={`cms-tab-btn ${categoryFilter === 'content' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('content')}
              >
                Content
              </button>
              <button
                type="button"
                className={`cms-tab-btn ${categoryFilter === 'sessions' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('sessions')}
              >
                Sessions
              </button>
            </div>

            <div style={{ width: '180px' }}>
              <AdminCombobox
                value={actionFilter}
                onChange={setActionFilter}
                options={[
                  { value: 'all', label: 'All Actions' },
                  ...uniqueActions.map((act) => ({ value: act, label: act })),
                ]}
                placeholder="Filter action…"
              />
            </div>
          </div>
        </div>

        {/* ── Table Container ── */}
        <div className="admin-table-wrap">
          {filteredEntries.length === 0 ? (
            <div className="cms-empty-state">
              <div className="cms-empty-icon">
                <AlertCircle size={24} />
              </div>
              <h4 className="cms-empty-title">No Audit Logs Found</h4>
              <p className="cms-empty-subtitle">
                {searchTerm || categoryFilter !== 'all' || actionFilter !== 'all'
                  ? 'Try adjusting your search criteria or category filters.'
                  : 'Platform activities will automatically record here in real time.'}
              </p>
            </div>
          ) : (
            <table className="admin-table audit-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }} />
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Section / Entity</th>
                  <th>Target Record</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, idx) => {
                  const key = entry.id ? String(entry.id) : `${entry.created_at}-${idx}`
                  const isExpanded = expandedId === key
                  const isUser = isUserSubmission(entry)

                  return (
                    <Fragment key={key}>
                      <tr
                        className={`audit-row ${isExpanded ? 'audit-row--expanded' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : key)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--adm-muted)' }}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td data-label="Action">
                          {getActionBadge(entry.action)}
                        </td>
                        <td data-label="Actor">
                          <div className="audit-actor-cell">
                            {isUser ? (
                              <span className="audit-actor-badge audit-actor-badge--user">
                                <User size={12} />
                                <span>{entry.details?.email || entry.details?.applicantEmail || 'Public User'}</span>
                              </span>
                            ) : (
                              <span className="audit-actor-badge audit-actor-badge--admin">
                                <ShieldCheck size={12} />
                                <span>{entry.actor_id === currentAdminEmail ? 'You (Admin)' : 'Admin'}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td data-label="Entity">
                          <span className="audit-entity-tag">
                            {entry.entity.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td data-label="Record ID" className="admin-table__id">
                          {entry.entity_id ? (
                            <span className="audit-record-id" title={entry.entity_id}>
                              {entry.entity_id.length > 18 ? `${entry.entity_id.slice(0, 15)}...` : entry.entity_id}
                            </span>
                          ) : (
                            <span style={{ opacity: 0.4 }}>—</span>
                          )}
                        </td>
                        <td data-label="Time">
                          <div className="audit-time-cell">
                            <span className="audit-time-utc">{formatUtc(entry.created_at)}</span>
                            <small className="audit-time-rel">{formatRelative(entry.created_at)}</small>
                          </div>
                        </td>
                        <td data-label="Details" style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="audit-inspect-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedId(isExpanded ? null : key)
                            }}
                          >
                            {isExpanded ? 'Close' : 'Inspect'}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="audit-details-row">
                          <td colSpan={7}>
                            <div className="audit-inspector">
                              <div className="audit-inspector-head">
                                <div className="audit-inspector-meta">
                                  <Terminal size={14} className="audit-terminal-icon" />
                                  <strong>Event Payload &amp; Context</strong>
                                  <span className="audit-raw-time">{entry.created_at}</span>
                                </div>
                                <span className="audit-entity-pill">{entry.entity}</span>
                              </div>

                              <div className="audit-inspector-grid">
                                <div className="audit-key-val">
                                  <span className="audit-kv-key">Action Type</span>
                                  <span className="audit-kv-val">{entry.action}</span>
                                </div>
                                <div className="audit-key-val">
                                  <span className="audit-kv-key">Target Entity</span>
                                  <span className="audit-kv-val">{entry.entity}</span>
                                </div>
                                <div className="audit-key-val">
                                  <span className="audit-kv-key">Record ID</span>
                                  <span className="audit-kv-val">{entry.entity_id || 'N/A (Multi-row/System)'}</span>
                                </div>
                                <div className="audit-key-val">
                                  <span className="audit-kv-key">Actor ID</span>
                                  <span className="audit-kv-val">{entry.actor_id || 'Public/Guest'}</span>
                                </div>
                              </div>

                              <div className="audit-json-box">
                                <p className="audit-json-title">JSON Metadata &amp; Parameters</p>
                                <pre className="audit-json-code">
                                  {entry.details
                                    ? JSON.stringify(entry.details, null, 2)
                                    : '// No additional payload captured'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="cms-records-card__foot">
          <p>
            Showing {filteredEntries.length} of {initialEntries.length} recorded platform events. Clearing the audit trail requires super admin access and typed confirmation.
          </p>
        </div>
      </div>
    </div>
  )
}
