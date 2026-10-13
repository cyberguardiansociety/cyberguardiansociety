import Link from 'next/link'
import {
  Check,
  FileText,
  ShieldCheck,
  User,
  Mail,
  MapPin,
  GraduationCap,
  Briefcase,
  Award,
  Globe,
  Trash2,
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
} from 'lucide-react'
import { updateApplicationStatus, deleteApplication } from '@/app/admin/actions'
import { requirePermission } from '@/lib/admin-auth'
import {
  createPrivateSignedUrl,
  listPrivateObjects,
  readPrivateText,
} from '@/lib/supabase-storage'
import AdminDeleteButton from '@/components/admin/AdminDeleteButton'

type ApplicationStatus = 'received' | 'reviewing' | 'accepted' | 'declined'

type Application = {
  directory: string
  reference: string
  fullName: string
  preferredName: string
  email: string
  phone: string
  location: string
  submittedAt: string
  currentStatus: string
  institution: string
  degree: string
  primaryDivision: string
  divisions: string[]
  skills: string[]
  experience: string
  projects: string
  certifications: string
  cyberAreas: string[]
  reviewStatus: ApplicationStatus
  cvUrl: string | null
}

const directoryPattern = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}_(?:[a-f0-9]{6}|[a-f0-9]{32})$/
const statuses: ApplicationStatus[] = ['received', 'reviewing', 'accepted', 'declined']

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function formatUtc(value: string) {
  const time = new Date(value)
  if (!Number.isFinite(time.getTime())) return 'Submission date unavailable'
  return `${new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(time)} UTC`
}

async function readApplication(directory: string): Promise<Application | null> {
  const prefix = `applications/${directory}`
  const content = await readPrivateText(`${prefix}/application.json`)
  if (!content) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

  const document = parsed as Record<string, unknown>
  const personal = objectValue(document.personal)
  const academic = objectValue(document.academic)
  const divisions = objectValue(document.divisions)
  const skills = objectValue(document.skills)
  const cybersecurity = objectValue(document.cybersecurity)
  const attachments = objectValue(document.attachments)
  const cv = objectValue(attachments.cv)
  const statusValue = stringValue(document.status)
  const reviewStatus = statuses.includes(statusValue as ApplicationStatus)
    ? statusValue as ApplicationStatus
    : 'received'
  const hasCv = Boolean(cv.name)

  return {
    directory: prefix,
    reference: stringValue(document.reference) || directory,
    fullName: stringValue(personal.fullName) || 'Unnamed applicant',
    preferredName: stringValue(personal.preferredName),
    email: stringValue(personal.email),
    phone: stringValue(personal.phone),
    location: [stringValue(personal.city), stringValue(personal.country)].filter(Boolean).join(', '),
    submittedAt: stringValue(document.submittedAt),
    currentStatus: stringValue(academic.currentStatus),
    institution: stringValue(academic.institution),
    degree: stringValue(academic.degree),
    primaryDivision: stringValue(divisions.primary),
    divisions: stringList(divisions.selected),
    skills: stringList(skills.selected),
    experience: stringValue(skills.previousExperience),
    projects: stringValue(skills.projects),
    certifications: stringValue(skills.certifications),
    cyberAreas: stringList(cybersecurity.areas),
    reviewStatus,
    cvUrl: hasCv ? await createPrivateSignedUrl(`${prefix}/cv.pdf`, 300) : null,
  }
}

function ApplicantDetails({ application }: { application: Application }) {
  const statusColors = {
    received: 'status-received',
    reviewing: 'status-reviewing',
    accepted: 'status-accepted',
    declined: 'status-declined',
  }

  const statusLabels = {
    received: 'Received',
    reviewing: 'Reviewing',
    accepted: 'Accepted',
    declined: 'Declined',
  }

  return (
    <details className="admin-application admin-modern-card" key={application.directory}>
      <summary className="admin-application__summary admin-modern-card-summary">
        <div className="admin-card-avatar admin-applicant-avatar">
          {application.fullName.slice(0, 1).toUpperCase()}
        </div>
        <div className="admin-card-content">
          <div className="admin-card-title">
            <strong>{application.fullName}{application.preferredName ? ` (${application.preferredName})` : ''}</strong>
            <span className={`admin-status-badge ${statusColors[application.reviewStatus]}`}>
              {statusLabels[application.reviewStatus] || application.reviewStatus}
            </span>
          </div>
          <div className="admin-card-meta">
            <span className="admin-card-meta-item">
              <Mail size={12} />
              {application.email || 'No email'}
            </span>
            <span className="admin-card-meta-item">
              <User size={12} />
              {application.reference}
            </span>
            <span className="admin-card-meta-item">
              {formatUtc(application.submittedAt)}
            </span>
          </div>
        </div>

        {/* Top-Right Corner Action Controls */}
        <div className="admin-card-top-actions">
          <AdminDeleteButton
            action={deleteApplication}
            name="directory"
            value={application.directory}
            variant="icon"
            title="Delete application"
            confirmMessage={`Permanently delete application from "${application.fullName}"? All uploaded materials will be removed.`}
            className="admin-card-delete-icon-btn"
          />
          <div className="admin-card-chevron">
            <span>Review</span>
          </div>
        </div>
      </summary>

      <div className="admin-application__body admin-modern-card-body">
        <div className="admin-applicant-details-grid">
          <div className="admin-detail-section">
            <h4 className="admin-detail-section-title"><User size={14} /> Contact Information</h4>
            <div className="admin-detail-grid">
              <div className="admin-detail-item">
                <span className="admin-detail-label">Email</span>
                <strong>{application.email || 'No email'}</strong>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">Phone</span>
                <strong>{application.phone || 'No phone'}</strong>
              </div>
              <div className="admin-detail-item admin-detail-item-wide">
                <span className="admin-detail-label">Location</span>
                <strong>{application.location || 'Not provided'}</strong>
              </div>
            </div>
          </div>

          <div className="admin-detail-section">
            <h4 className="admin-detail-section-title"><GraduationCap size={14} /> Education</h4>
            <div className="admin-detail-grid">
              <div className="admin-detail-item">
                <span className="admin-detail-label">Degree</span>
                <strong>{application.degree || 'Not provided'}</strong>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">Institution</span>
                <strong>{application.institution || 'Not provided'}</strong>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">Current Status</span>
                <strong>{application.currentStatus || 'Not provided'}</strong>
              </div>
            </div>
          </div>

          <div className="admin-detail-section">
            <h4 className="admin-detail-section-title"><Briefcase size={14} /> Professional Background</h4>
            <div className="admin-detail-grid">
              <div className="admin-detail-item">
                <span className="admin-detail-label">Primary Division</span>
                <strong>{application.primaryDivision || 'Not provided'}</strong>
              </div>
              <div className="admin-detail-item admin-detail-item-wide">
                <span className="admin-detail-label">Divisions</span>
                <strong>{application.divisions.join(', ') || 'Not provided'}</strong>
              </div>
              <div className="admin-detail-item admin-detail-item-wide">
                <span className="admin-detail-label">Skills</span>
                <strong>{application.skills.join(', ') || 'Not provided'}</strong>
              </div>
            </div>
          </div>

          <div className="admin-detail-section">
            <h4 className="admin-detail-section-title"><Globe size={14} /> Cybersecurity Interests</h4>
            <div className="admin-detail-item admin-detail-item-wide">
              <span className="admin-detail-label">Areas of Interest</span>
              <strong>{application.cyberAreas.join(', ') || 'Not provided'}</strong>
            </div>
          </div>

          {application.experience ? (
            <div className="admin-detail-section admin-detail-section-wide">
              <h4 className="admin-detail-section-title"><Briefcase size={14} /> Previous Experience</h4>
              <p className="admin-detail-text">{application.experience}</p>
            </div>
          ) : null}

          {application.projects ? (
            <div className="admin-detail-section admin-detail-section-wide">
              <h4 className="admin-detail-section-title"><Award size={14} /> Projects</h4>
              <p className="admin-detail-text">{application.projects}</p>
            </div>
          ) : null}

          {application.certifications ? (
            <div className="admin-detail-section admin-detail-section-wide">
              <h4 className="admin-detail-section-title"><Award size={14} /> Certifications</h4>
              <p className="admin-detail-text">{application.certifications}</p>
            </div>
          ) : null}
        </div>

        {/* Action Controls in Expanded Card Body */}
        <div className="admin-application__actions admin-modern-card-actions">
          <div className="admin-cv-section">
            {application.cvUrl ? (
              <a className="admin-secondary-button admin-modern-button" href={application.cvUrl} target="_blank" rel="noreferrer">
                <FileText size={14} />
                Open CV
              </a>
            ) : (
              <span className="admin-cv-missing">
                <FileText size={14} />
                No CV attached
              </span>
            )}
          </div>

          <div className="admin-application-review-actions">
            <form action={updateApplicationStatus} className="admin-review-combobox-form">
              <input type="hidden" name="directory" value={application.directory} />
              <div className="admin-review-combobox-group">
                <label className="admin-review-combobox-label">
                  Review status
                </label>
                <div className="admin-combobox-wrapper admin-combobox-wrapper--review">
                  <span className="admin-combobox-dot" data-status={application.reviewStatus} />
                  <select name="status" defaultValue={application.reviewStatus} className="admin-combobox-select admin-combobox-select--review">
                    <option value="received">Received</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                  </select>
                  <ChevronDown size={13} className="admin-combobox-chevron" />
                </div>
              </div>
              <button type="submit" className="admin-primary-button admin-modern-button">
                <Check size={15} />
                <span>Save status</span>
              </button>
            </form>

            <div className="admin-application-delete-btn-wrap">
              <AdminDeleteButton
                action={deleteApplication}
                name="directory"
                value={application.directory}
                label="Delete application"
                variant="full"
                title="Delete application"
                confirmMessage={`Permanently delete application from "${application.fullName}"? This action cannot be undone.`}
              />
            </div>
          </div>
        </div>
      </div>
    </details>
  )
}

export default async function AdminApplications({
  query = '',
  statusFilter = '',
}: {
  query?: string
  statusFilter?: string
}) {
  await requirePermission('applications')
  const folders = await listPrivateObjects('applications', 100)
  if (!folders) {
    return <p role="alert" className="admin-alert admin-alert--error">Private application storage is unavailable. Check the server storage configuration.</p>
  }

  const directories = folders
    .filter((file) => file.id == null && directoryPattern.test(file.name))
    .map((file) => file.name)
  const results = await Promise.all(directories.map(readApplication))
  const allApplications = results
    .filter((item): item is Application => item !== null)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))

  // Counts by status
  const totalCount = allApplications.length
  const receivedCount = allApplications.filter((a) => a.reviewStatus === 'received').length
  const reviewingCount = allApplications.filter((a) => a.reviewStatus === 'reviewing').length
  const acceptedCount = allApplications.filter((a) => a.reviewStatus === 'accepted').length
  const declinedCount = allApplications.filter((a) => a.reviewStatus === 'declined').length

  const filter = ['received', 'reviewing', 'accepted', 'declined'].includes(statusFilter) ? statusFilter : ''
  const search = query.trim().toLowerCase().slice(0, 100)

  const filteredApplications = allApplications.filter((app) => {
    if (filter && app.reviewStatus !== filter) return false
    if (search) {
      const match =
        app.fullName.toLowerCase().includes(search) ||
        app.email.toLowerCase().includes(search) ||
        app.reference.toLowerCase().includes(search) ||
        app.institution.toLowerCase().includes(search) ||
        app.degree.toLowerCase().includes(search) ||
        app.primaryDivision.toLowerCase().includes(search) ||
        app.skills.some((s) => s.toLowerCase().includes(search))
      if (!match) return false
    }
    return true
  })

  const isFiltered = Boolean(search || filter)

  return (
    <section className="admin-section admin-section--flush admin-modern-section admin-applications-section">
      <div className="admin-section__head">
        <div className="admin-section__head-icon">
          <User size={20} />
        </div>
        <div>
          <p className="admin-kicker">Membership review & candidates</p>
          <h2>Application queue <span className="admin-count-badge">{filteredApplications.length}</span></h2>
        </div>
        <span className="admin-private-note"><ShieldCheck size={14} /> Private records</span>
      </div>

      {/* ── Search & Filter Console for Applications ─────────────────── */}
      <div className="admin-inbox-console">
        <form method="get" className="admin-filter-console-form">
          <input type="hidden" name="view" value="applications" />

          {/* Search Field */}
          <div className="admin-search-field-capsule">
            <div className="admin-search-field-inner">
              <Search size={17} className="admin-search-field-icon" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search candidates by name, email, institution, or skills..."
                className="admin-search-field-input"
                aria-label="Search applications"
                autoComplete="off"
                spellCheck={false}
              />
              {query ? (
                <Link
                  href={`?view=applications${filter ? `&filter=${filter}` : ''}`}
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

          {/* Status Combo Box */}
          <div className="admin-combobox-container">
            <div className="admin-combobox-wrapper">
              <div className="admin-combobox-icon-group">
                <SlidersHorizontal size={14} className="admin-combobox-icon" />
                <span className="admin-combobox-dot" data-status={filter || 'all'} />
              </div>
              <select
                name="filter"
                defaultValue={filter || 'all'}
                aria-label="Filter applications by status"
                className="admin-combobox-select"
              >
                <option value="all">All statuses ({totalCount})</option>
                <option value="received">Received ({receivedCount})</option>
                <option value="reviewing">Reviewing ({reviewingCount})</option>
                <option value="accepted">Accepted ({acceptedCount})</option>
                <option value="declined">Declined ({declinedCount})</option>
              </select>
              <ChevronDown size={14} className="admin-combobox-chevron" />
            </div>

            <button type="submit" className="admin-filter-apply-btn">
              Apply
            </button>
          </div>
        </form>

        {/* Quick Status Tabs */}
        <div className="admin-status-pills-bar" role="navigation" aria-label="Application status quick filter">
          <Link
            href={`?view=applications${search ? `&q=${encodeURIComponent(search)}` : ''}`}
            className={`admin-status-pill ${!filter ? 'admin-status-pill--active' : ''}`}
          >
            <span className="admin-status-pill__dot admin-status-pill__dot--all" />
            <span className="admin-status-pill__label">All</span>
            <span className="admin-status-pill__count">{totalCount}</span>
          </Link>

          <Link
            href={`?view=applications&filter=received${search ? `&q=${encodeURIComponent(search)}` : ''}`}
            className={`admin-status-pill admin-status-pill--received ${filter === 'received' ? 'admin-status-pill--active' : ''}`}
          >
            <span className="admin-status-pill__dot admin-status-pill__dot--received" />
            <span className="admin-status-pill__label">Received</span>
            <span className="admin-status-pill__count">{receivedCount}</span>
          </Link>

          <Link
            href={`?view=applications&filter=reviewing${search ? `&q=${encodeURIComponent(search)}` : ''}`}
            className={`admin-status-pill admin-status-pill--reviewing ${filter === 'reviewing' ? 'admin-status-pill--active' : ''}`}
          >
            <span className="admin-status-pill__dot admin-status-pill__dot--reviewing" />
            <span className="admin-status-pill__label">Reviewing</span>
            <span className="admin-status-pill__count">{reviewingCount}</span>
          </Link>

          <Link
            href={`?view=applications&filter=accepted${search ? `&q=${encodeURIComponent(search)}` : ''}`}
            className={`admin-status-pill admin-status-pill--accepted ${filter === 'accepted' ? 'admin-status-pill--active' : ''}`}
          >
            <span className="admin-status-pill__dot admin-status-pill__dot--accepted" />
            <span className="admin-status-pill__label">Accepted</span>
            <span className="admin-status-pill__count">{acceptedCount}</span>
          </Link>

          <Link
            href={`?view=applications&filter=declined${search ? `&q=${encodeURIComponent(search)}` : ''}`}
            className={`admin-status-pill admin-status-pill--declined ${filter === 'declined' ? 'admin-status-pill--active' : ''}`}
          >
            <span className="admin-status-pill__dot admin-status-pill__dot--declined" />
            <span className="admin-status-pill__label">Declined</span>
            <span className="admin-status-pill__count">{declinedCount}</span>
          </Link>

          {isFiltered ? (
            <Link href="?view=applications" className="admin-status-pill-reset" title="Reset all filters">
              <X size={12} />
              <span>Reset filter</span>
            </Link>
          ) : null}
        </div>
      </div>

      {filteredApplications.length ? (
        <div className="admin-application-list admin-modern-list">
          {filteredApplications.map((application) => (
            <ApplicantDetails key={application.directory} application={application} />
          ))}
        </div>
      ) : (
        <div className="admin-empty admin-surface admin-modern-empty">
          <User size={36} />
          <h4>No applications found</h4>
          <p>
            {isFiltered
              ? 'No applicant records match your current search or status criteria.'
              : 'No applications have been received yet. New membership submissions will appear here.'}
          </p>
          {isFiltered ? (
            <Link href="?view=applications" className="admin-secondary-button admin-modern-button">
              Clear all filters
            </Link>
          ) : null}
        </div>
      )}
    </section>
  )
}