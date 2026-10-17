import Link from 'next/link'
import {
  Mail,
  MessageSquareText,
  UserRound,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  SlidersHorizontal,
  X,
  Trash2,
  Tag,
  ChevronDown,
} from 'lucide-react'
import { requirePermission } from '@/lib/admin-auth'
import { updateInboxMessageStatus, deleteInboxMessage, clearClosedInboxMessages } from '@/app/admin/operations-actions'
import AdminDeleteButton from '@/components/admin/AdminDeleteButton'

type InboxMessage = {
  id: string
  kind: 'contact' | 'membership_interest'
  name: string
  email: string
  message: string
  metadata: Record<string, unknown>
  status: 'new' | 'in_progress' | 'closed'
  created_at: string
}

function formatDate(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function getSubmissionLabel(record: InboxMessage) {
  if (record.metadata?.source === 'speaker-application') return 'Speaker application'
  return record.kind === 'contact' ? 'Contact message' : 'Membership enquiry'
}

export default async function AdminInbox({
  query = '',
  statusFilter = '',
}: {
  query?: string
  statusFilter?: string
}) {
  const { supabase } = await requirePermission('inbox')
  const filter = ['new', 'in_progress', 'closed'].includes(statusFilter) ? statusFilter : ''
  const search = query.trim().slice(0, 100)

  // Fetch status counts for quick-filter tabs and header readout
  const [{ count: totalCount }, { count: newCount }, { count: inProgressCount }, { count: closedCount }] =
    await Promise.all([
      supabase.from('cgs_inbox_messages').select('*', { count: 'exact', head: true }),
      supabase.from('cgs_inbox_messages').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('cgs_inbox_messages').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('cgs_inbox_messages').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
    ])

  let request = supabase
    .from('cgs_inbox_messages')
    .select('id, kind, name, email, message, metadata, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (filter) request = request.eq('status', filter)

  if (search) {
    const pattern = `%${search}%`
    const [{ data: names }, { data: emails }, { data: messages }] = await Promise.all([
      supabase.from('cgs_inbox_messages').select('id').ilike('name', pattern).limit(100),
      supabase.from('cgs_inbox_messages').select('id').ilike('email', pattern).limit(100),
      supabase.from('cgs_inbox_messages').select('id').ilike('message', pattern).limit(100),
    ])
    const ids = [
      ...new Set([...(names ?? []), ...(emails ?? []), ...(messages ?? [])].map((row) => row.id as string)),
    ]
    request = ids.length ? request.in('id', ids) : request.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data, error } = await request
  const records = (data ?? []) as InboxMessage[]

  const statusColors = {
    new: 'status-new',
    in_progress: 'status-in-progress',
    closed: 'status-closed',
  }

  const statusLabels = {
    new: 'New',
    in_progress: 'In progress',
    closed: 'Closed',
  }

  const isFiltered = Boolean(search || filter)

  return (
    <section className="admin-section admin-section--flush admin-modern-section admin-inbox-section">
      {/* ── Section Head with Top-Right Action Controls ────────────────── */}
      <div className="admin-section__head admin-inbox-head">
        <div className="admin-section__head-icon admin-inbox-head-icon">
          <Mail size={22} />
        </div>
        <div>
          <p className="admin-kicker">Public submissions & enquiries</p>
          <h2>
            Inbox management <span className="admin-count-badge">{records.length}</span>
          </h2>
        </div>

        {/* Top-Right Corner Action Controls */}
        <div className="admin-inbox-head-actions">
          {(closedCount ?? 0) > 0 ? (
            <AdminDeleteButton
              action={clearClosedInboxMessages}
              name="action"
              value="clear-closed"
              label={`Clear closed (${closedCount})`}
              confirmMessage={`Are you sure you want to permanently delete all ${closedCount} closed inbox messages?`}
              variant="compact"
              title="Delete all closed messages"
              className="admin-clear-closed-btn"
            />
          ) : null}
          <span className="admin-private-note">
            <Sparkles size={13} /> Admin workspace
          </span>
        </div>
      </div>

      {/* ── Redesigned Search Console & Status Combo Box ─────────────── */}
      <div className="admin-inbox-console">
        <form method="get" className="admin-filter-console-form">
          <input type="hidden" name="view" value="inbox" />

          {/* Redesigned Search Field */}
          <div className="admin-search-field-capsule">
            <div className="admin-search-field-inner">
              <Search size={17} className="admin-search-field-icon" />
              <input
                name="q"
                defaultValue={search}
                placeholder="Search by name, email address, keyword, or message..."
                className="admin-search-field-input"
                aria-label="Search inbox messages"
                autoComplete="off"
                spellCheck={false}
              />
              {search ? (
                <Link
                  href={`?view=inbox${filter ? `&filter=${filter}` : ''}`}
                  className="admin-search-clear-btn"
                  title="Clear search query"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </Link>
              ) : null}
            </div>

            <button type="submit" className="admin-search-submit-btn" aria-label="Perform search">
              <Search size={14} />
              <span>Search</span>
            </button>
          </div>

          {/* Redesigned Status Combo Box */}
          <div className="admin-combobox-container">
            <div className="admin-combobox-wrapper">
              <div className="admin-combobox-icon-group">
                <SlidersHorizontal size={14} className="admin-combobox-icon" />
                <span className="admin-combobox-dot" data-status={filter || 'all'} />
              </div>
              <select
                name="filter"
                defaultValue={filter || 'all'}
                aria-label="Filter inbox by status"
                className="admin-combobox-select"
              >
                <option value="all">All statuses ({totalCount ?? 0})</option>
                <option value="new">New ({newCount ?? 0})</option>
                <option value="in_progress">In progress ({inProgressCount ?? 0})</option>
                <option value="closed">Closed ({closedCount ?? 0})</option>
              </select>
              <ChevronDown size={14} className="admin-combobox-chevron" />
            </div>

            <button type="submit" className="admin-filter-apply-btn">
              Apply
            </button>
          </div>
        </form>

        {/* Quick Status Filter Tabs with Live Counters */}
        <div className="admin-status-pills-bar" role="navigation" aria-label="Status quick filter">
          <Link
            href={`?view=inbox${search ? `&q=${encodeURIComponent(search)}` : ''}`}
            className={`admin-status-pill ${!filter ? 'admin-status-pill--active' : ''}`}
          >
            <span className="admin-status-pill__dot admin-status-pill__dot--all" />
            <span className="admin-status-pill__label">All</span>
            <span className="admin-status-pill__count">{totalCount ?? 0}</span>
          </Link>

          <Link
            href={`?view=inbox&filter=new${search ? `&q=${encodeURIComponent(search)}` : ''}`}
            className={`admin-status-pill admin-status-pill--new ${filter === 'new' ? 'admin-status-pill--active' : ''}`}
          >
            <span className="admin-status-pill__dot admin-status-pill__dot--new" />
            <span className="admin-status-pill__label">New</span>
            <span className="admin-status-pill__count">{newCount ?? 0}</span>
          </Link>

          <Link
            href={`?view=inbox&filter=in_progress${search ? `&q=${encodeURIComponent(search)}` : ''}`}
            className={`admin-status-pill admin-status-pill--in-progress ${filter === 'in_progress' ? 'admin-status-pill--active' : ''}`}
          >
            <span className="admin-status-pill__dot admin-status-pill__dot--in-progress" />
            <span className="admin-status-pill__label">In Progress</span>
            <span className="admin-status-pill__count">{inProgressCount ?? 0}</span>
          </Link>

          <Link
            href={`?view=inbox&filter=closed${search ? `&q=${encodeURIComponent(search)}` : ''}`}
            className={`admin-status-pill admin-status-pill--closed ${filter === 'closed' ? 'admin-status-pill--active' : ''}`}
          >
            <span className="admin-status-pill__dot admin-status-pill__dot--closed" />
            <span className="admin-status-pill__label">Closed</span>
            <span className="admin-status-pill__count">{closedCount ?? 0}</span>
          </Link>

          {isFiltered ? (
            <Link href="?view=inbox" className="admin-status-pill-reset" title="Reset all filters">
              <X size={12} />
              <span>Reset filter</span>
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="admin-alert admin-alert--error">
          Inbox unavailable. Apply the submissions inbox migration.
        </p>
      ) : null}

      {/* ── Inbox Messages List ───────────────────────────────────────── */}
      <div className="admin-inbox-list admin-modern-list">
        {records.map((record) => (
          <details className="admin-inbox-item admin-modern-card" key={record.id}>
            <summary className="admin-inbox-item__summary admin-modern-card-summary">
              <div className="admin-card-avatar admin-inbox-avatar">
                <UserRound size={16} />
              </div>
              <div className="admin-card-content">
                <div className="admin-card-title">
                  <strong>{record.name}</strong>
                  <span className={`admin-status-badge ${statusColors[record.status as keyof typeof statusColors]}`}>
                    {statusLabels[record.status as keyof typeof statusLabels] || record.status}
                  </span>
                </div>
                <div className="admin-card-meta">
                  <span className="admin-card-meta-item">
                    <Mail size={12} />
                    {record.email}
                  </span>
                  <span className="admin-card-meta-item">
                    <Tag size={12} />
                    {getSubmissionLabel(record)}
                  </span>
                  <span className="admin-card-meta-item">
                    <Clock size={12} />
                    {formatDate(record.created_at)}
                  </span>
                </div>
              </div>

              {/* Top-Right Corner Action Controls on Card */}
              <div className="admin-card-top-actions">
                <AdminDeleteButton
                  action={deleteInboxMessage}
                  name="id"
                  value={record.id}
                  variant="icon"
                  title="Delete message"
                  confirmMessage={`Delete message from "${record.name}"? This cannot be undone.`}
                  className="admin-card-delete-icon-btn"
                />
                <div className="admin-card-chevron">
                  <span>Open</span>
                </div>
              </div>
            </summary>

            <div className="admin-inbox-item__body admin-modern-card-body">
              <p className="admin-inbox-message admin-modern-message">
                <MessageSquareText size={16} className="admin-message-icon" />
                <span>{record.message}</span>
              </p>

              {Object.keys(record.metadata ?? {}).some(
                (key) => key !== 'source' && record.metadata[key] != null,
              ) ? (
                <dl className="admin-inbox-meta admin-modern-meta">
                  {Object.entries(record.metadata)
                    .filter(([key, value]) => key !== 'source' && value != null)
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>{key.replaceAll('_', ' ')}</dt>
                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                </dl>
              ) : null}

              {/* Redesigned Card Actions: Status Combo Box + Save + Delete Button */}
              <div className="admin-inbox-item-actions admin-modern-card-actions">
                <form action={updateInboxMessageStatus} className="admin-review-combobox-form">
                  <input type="hidden" name="id" value={record.id} />
                  <div className="admin-review-combobox-group">
                    <label htmlFor={`status-select-${record.id}`} className="admin-review-combobox-label">
                      Status
                    </label>
                    <div className="admin-combobox-wrapper admin-combobox-wrapper--review">
                      <span className="admin-combobox-dot" data-status={record.status} />
                      <select
                        id={`status-select-${record.id}`}
                        name="status"
                        defaultValue={record.status}
                        className="admin-combobox-select admin-combobox-select--review"
                      >
                        <option value="new">New</option>
                        <option value="in_progress">In progress</option>
                        <option value="closed">Closed</option>
                      </select>
                      <ChevronDown size={13} className="admin-combobox-chevron" />
                    </div>
                  </div>
                  <button className="admin-primary-button admin-modern-button" type="submit">
                    <CheckCircle size={14} />
                    <span>Save status</span>
                  </button>
                </form>

                <div className="admin-inbox-item-delete">
                  <AdminDeleteButton
                    action={deleteInboxMessage}
                    name="id"
                    value={record.id}
                    label="Delete message"
                    variant="full"
                    title="Delete message"
                    confirmMessage={`Permanently delete message from "${record.name}"? This action cannot be undone.`}
                  />
                </div>
              </div>
            </div>
          </details>
        ))}

        {!error && records.length === 0 ? (
          <div className="admin-empty admin-surface admin-modern-empty">
            <Mail size={36} />
            <h4>No messages match your criteria</h4>
            <p>
              {isFiltered
                ? 'Try adjusting your search keywords or status filter.'
                : 'No contact or membership enquiries have been received yet.'}
            </p>
            {isFiltered ? (
              <Link href="?view=inbox" className="admin-secondary-button admin-modern-button">
                Clear all filters
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="admin-form-note">
        Showing up to 100 most recent submissions. All deletions are audited.
      </p>
    </section>
  )
}