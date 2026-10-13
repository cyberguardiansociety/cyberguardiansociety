import { Mic, Mail, Clock, Calendar, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { requirePermission } from '@/lib/admin-auth'
import { updateInboxMessageStatus } from '@/app/admin/operations-actions'
import { deleteSpeakerApplication } from '@/app/admin/management-actions'

export default async function AdminSpeakerApplications() {
  const { supabase } = await requirePermission('speaker_applications')
  const { data, error } = await supabase.from('cgs_inbox_messages')
    .select('id, name, email, message, metadata, status, created_at')
    .eq('metadata->>source', 'speaker-application')
    .order('created_at', { ascending: false })
    .limit(200)

  const statusColors = {
    new: 'status-new',
    in_progress: 'status-in-progress',
    closed: 'status-closed',
  }

  return (
    <section className="admin-section admin-section--flush admin-modern-section">
      <div className="admin-section__head">
        <div className="admin-section__head-icon">
          <Mic size={20} />
        </div>
        <div>
          <p className="admin-kicker">Speaker pipeline</p>
          <h2>Speaker applications <span>{data?.length ?? 0}</span></h2>
        </div>
      </div>
      {error ? <p role="alert" className="admin-alert admin-alert--error">Speaker applications are unavailable. Apply the platform management migration.</p> : null}
      <div className="admin-inbox-list admin-modern-list">
        {(data ?? []).map((application) => (
          <details className="admin-inbox-item admin-modern-card" key={application.id}>
            <summary className="admin-inbox-item__summary admin-modern-card-summary">
              <div className="admin-card-avatar admin-speaker-avatar">
                <Mic size={18} />
              </div>
              <div className="admin-card-content">
                <div className="admin-card-title">
                  <strong>{application.name}</strong>
                  <span className={`admin-status-badge ${statusColors[application.status as keyof typeof statusColors]}`}>
                    {application.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="admin-card-meta">
                  <span className="admin-card-meta-item">
                    <Mail size={12} />
                    {application.email}
                  </span>
                  <span className="admin-card-meta-item">
                    <Clock size={12} />
                    {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(application.created_at))}
                  </span>
                </div>
              </div>
              <div className="admin-card-chevron">
                <span>Open</span>
              </div>
            </summary>
            <div className="admin-inbox-item__body admin-modern-card-body">
              <div className="admin-speaker-details-grid admin-modern-details-grid">
                <div className="admin-speaker-detail admin-modern-detail">
                  <span className="admin-speaker-detail__label">Applicant</span>
                  <strong>{application.name}</strong>
                  <small>{application.email}</small>
                </div>
                {application.metadata?.session_title ? (
                  <div className="admin-speaker-detail admin-modern-detail">
                    <span className="admin-speaker-detail__label">Session Title</span>
                    <strong>{String(application.metadata.session_title)}</strong>
                  </div>
                ) : null}
                {application.metadata?.expertise ? (
                  <div className="admin-speaker-detail admin-modern-detail">
                    <span className="admin-speaker-detail__label">Expertise</span>
                    <strong>{String(application.metadata.expertise)}</strong>
                  </div>
                ) : null}
                {application.metadata?.preferred_session_platform ? (
                  <div className="admin-speaker-detail admin-modern-detail">
                    <span className="admin-speaker-detail__label">Preferred Platform</span>
                    <strong>{String(application.metadata.preferred_session_platform)}</strong>
                  </div>
                ) : null}
              </div>
              <div className="admin-inbox-message admin-modern-message">
                <Calendar size={14} />
                {application.message}
              </div>
              {Object.keys(application.metadata ?? {}).some((key) => !['source', 'session_title', 'expertise', 'preferred_session_platform'].includes(key) && application.metadata[key] != null) ? (
                <dl className="admin-inbox-meta admin-modern-meta">
                  {Object.entries(application.metadata ?? {})
                    .filter(([key, value]) => !['source', 'session_title', 'expertise', 'preferred_session_platform'].includes(key) && value != null)
                    .map(([key, value]) => (
                      <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{String(value)}</dd></div>
                    ))}
                </dl>
              ) : null}
              <div className="admin-management-actions admin-modern-card-actions">
                <form action={updateInboxMessageStatus} className="admin-review-form admin-modern-review-form">
                  <input type="hidden" name="id" value={application.id} />
                  <label className="admin-label">
                    <span>Status</span>
                    <select name="status" defaultValue={application.status}>
                      <option value="new">New</option>
                      <option value="in_progress">In progress</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                  <button type="submit" className="admin-primary-button admin-modern-button">
                    <CheckCircle size={14} />
                    Save status
                  </button>
                </form>
                <form action={deleteSpeakerApplication}>
                  <input type="hidden" name="id" value={application.id} />
                  <button type="submit" className="admin-danger-button admin-modern-button">
                    <Trash2 size={14} />
                    Delete application
                  </button>
                </form>
              </div>
            </div>
          </details>
        ))}
        {!error && data?.length === 0 ? (
          <div className="admin-empty admin-surface admin-modern-empty">
            <Mic size={32} />
            <p>No speaker applications yet.</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
