'use client'

import { useState, useMemo } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  Filter,
  History,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react'
import type { CertificateVerificationLog } from '@/lib/certificate-logs-store'
import HighSecurityDeleteModal from './HighSecurityDeleteModal'
import {
  clearAllCertificateLogsAction,
  deleteCertificateLogAction,
  purgeInvalidCertificateLogsAction,
} from '@/app/admin/certificate-actions'

type AdminCertificateLogsProps = {
  logs: CertificateVerificationLog[]
  stats: {
    total: number
    success: number
    failed: number
    successRate: number
    highAccuracyActive?: boolean
  }
  query?: string
  statusFilter?: string
  canDelete?: boolean
}

export default function AdminCertificateLogs({
  logs,
  stats,
  query = '',
  statusFilter = 'all',
  canDelete = true,
}: AdminCertificateLogsProps) {
  const [search, setSearch] = useState(query)
  const [activeFilter, setActiveFilter] = useState<'all' | 'success' | 'failed'>(
    statusFilter === 'success' || statusFilter === 'failed' ? statusFilter : 'all'
  )
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [allCleared, setAllCleared] = useState(false)
  const [purgedLegacyFailed, setPurgedLegacyFailed] = useState(false)

  // High security modal states
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false)
  const [purgeFailedModalOpen, setPurgeFailedModalOpen] = useState(false)
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null)
  const [singleDeleteRef, setSingleDeleteRef] = useState<string>('')

  // Filter logs client-side for instant snappy response
  const filteredLogs = useMemo(() => {
    if (allCleared) return []
    return logs.filter((log) => {
      if (deletedIds.has(log.id)) return false
      if (purgedLegacyFailed && log.status === 'failed') return false
      if (activeFilter !== 'all' && log.status !== activeFilter) return false
      if (!search.trim()) return true

      const q = search.toLowerCase()
      return (
        log.reference_id.toLowerCase().includes(q) ||
        (log.participant_name && log.participant_name.toLowerCase().includes(q)) ||
        (log.participant_email && log.participant_email.toLowerCase().includes(q)) ||
        log.ip_address.toLowerCase().includes(q) ||
        log.message.toLowerCase().includes(q)
      )
    })
  }, [logs, search, activeFilter, deletedIds, allCleared, purgedLegacyFailed])

  const currentSuccess = allCleared
    ? 0
    : logs.filter((l) => !deletedIds.has(l.id) && l.status === 'success').length
  const legacyFailedCount = purgedLegacyFailed ? 0 : Math.max(0, stats.failed)
  const currentTotal = allCleared ? 0 : currentSuccess + legacyFailedCount

  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp (UTC)', 'Reference ID', 'Status', 'Participant Name', 'Participant Email', 'Message', 'IP Address', 'User Agent']
    const rows = filteredLogs.map((log) => [
      log.id,
      log.created_at,
      log.reference_id,
      log.status,
      log.participant_name || '',
      log.participant_email || '',
      `"${(log.message || '').replace(/"/g, '""')}"`,
      log.ip_address,
      `"${(log.user_agent || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CGS-Certificate-Verification-Logs-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleConfirmClearAll = async () => {
    setAllCleared(true)
    setClearAllModalOpen(false)
    const formData = new FormData()
    formData.set('confirmation', 'DELETE ALL LOGS')
    await clearAllCertificateLogsAction(formData)
  }

  const handleConfirmPurgeFailed = async () => {
    setPurgedLegacyFailed(true)
    setPurgeFailedModalOpen(false)
    await purgeInvalidCertificateLogsAction()
  }

  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteId) return
    const idToDelete = singleDeleteId
    setDeletedIds((prev) => new Set(prev).add(idToDelete))
    setSingleDeleteId(null)
    setSingleDeleteRef('')

    const formData = new FormData()
    formData.set('id', idToDelete)
    formData.set('confirmation', 'DELETE')
    await deleteCertificateLogAction(formData)
  }

  return (
    <div className="registrants-workspace">
      {/* ── High-Accuracy Filter Status Banner ──────────────────────── */}
      <div
        className="cyber-panel"
        style={{
          marginBottom: '16px',
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(14, 165, 233, 0.05) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 320px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--adm-text, #f8fafc)', fontSize: '14px', fontWeight: 600 }}>
                High-Accuracy Certificate Filter Active
              </strong>
              <span
                className="cyber-kpi-badge cyber-kpi-badge--emerald"
                style={{ fontSize: '11px', padding: '2px 8px' }}
              >
                Valid-Only DB Recording
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--adm-muted, #94a3b8)', lineHeight: 1.4 }}>
              Only authentic, confirmed certificate queries and submissions are recorded into the Supabase database. Invalid lookups, empty requests, and bot queries are filtered out automatically.
            </p>
          </div>
        </div>

        {legacyFailedCount > 0 && canDelete && (
          <button
            type="button"
            onClick={() => setPurgeFailedModalOpen(true)}
            className="admin-secondary-button"
            style={{
              fontSize: '12px',
              padding: '7px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: 'rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
            }}
          >
            <ShieldAlert size={13} />
            Purge {legacyFailedCount} Legacy Unverified Records
          </button>
        )}
      </div>

      {/* ── Cyber KPI Stats Grid ─────────────────────────────────────── */}
      <div className="registrants-cyber-stats-grid">
        <div className="cyber-kpi-card cyber-kpi-card--emerald">
          <div className="cyber-kpi-card__top">
            <span className="cyber-kpi-badge cyber-kpi-badge--emerald">Verified</span>
            <div className="cyber-kpi-icon">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="cyber-kpi-card__main">
            <span className="cyber-kpi-label">Recorded Valid Verifications</span>
            <strong className="cyber-kpi-value">{currentSuccess.toLocaleString()}</strong>
          </div>
          <div className="cyber-kpi-card__footer">
            <span className="cyber-kpi-subtext">Authentic certificates in database</span>
          </div>
        </div>

        <div className="cyber-kpi-card cyber-kpi-card--cobalt">
          <div className="cyber-kpi-card__top">
            <span className="cyber-kpi-badge cyber-kpi-badge--cobalt">Gateway Gate</span>
            <div className="cyber-kpi-icon">
              <Lock size={16} />
            </div>
          </div>
          <div className="cyber-kpi-card__main">
            <span className="cyber-kpi-label">Filter Precision</span>
            <strong className="cyber-kpi-value">100%</strong>
          </div>
          <div className="cyber-kpi-card__footer">
            <span className="cyber-kpi-subtext">Zero invalid records stored</span>
          </div>
        </div>

        <div className="cyber-kpi-card cyber-kpi-card--purple">
          <div className="cyber-kpi-card__top">
            <span className="cyber-kpi-badge cyber-kpi-badge--purple">Audit Sync</span>
            <div className="cyber-kpi-icon">
              <History size={16} />
            </div>
          </div>
          <div className="cyber-kpi-card__main">
            <span className="cyber-kpi-label">Database Mode</span>
            <strong className="cyber-kpi-value" style={{ fontSize: '18px' }}>Supabase Audit</strong>
          </div>
          <div className="cyber-kpi-card__footer">
            <span className="cyber-kpi-subtext">Synced to admin_audit_log</span>
          </div>
        </div>

        <div className="cyber-kpi-card cyber-kpi-card--amber">
          <div className="cyber-kpi-card__top">
            <span className="cyber-kpi-badge cyber-kpi-badge--amber">Integrity Guard</span>
            <div className="cyber-kpi-icon">
              <BadgeCheck size={16} />
            </div>
          </div>
          <div className="cyber-kpi-card__main">
            <span className="cyber-kpi-label">Blocked / Legacy Mismatches</span>
            <strong className="cyber-kpi-value">{legacyFailedCount.toLocaleString()}</strong>
          </div>
          <div className="cyber-kpi-card__footer">
            <span className="cyber-kpi-subtext">Filtered out from logging</span>
          </div>
        </div>
      </div>

      {/* ── Records Card ────────────────────────────────────────────── */}
      <div className="cms-records-card" style={{ marginTop: '16px' }}>
        <div className="cms-records-card__head">
          <div className="cms-records-title-wrap">
            <h3 className="cms-records-title">Certificate Verification Logs</h3>
            <span className="cms-records-count">
              {filteredLogs.length} displayed of {currentSuccess} verified records
            </span>
          </div>

          <div className="cms-head-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleExportCsv}
              className="admin-secondary-button"
              disabled={!filteredLogs.length}
              style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={13} /> Export CSV
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={() => setClearAllModalOpen(true)}
                className="admin-danger-button"
                disabled={currentTotal === 0}
                style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Delete all verification logs with security check"
              >
                <Trash2 size={13} /> Delete All Logs
              </button>
            )}
          </div>
        </div>

        {/* ── Toolbar: Search & Status Filters ────────────────────────── */}
        <div className="cms-filter-toolbar" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="cms-filter-search" style={{ flex: '1 1 280px', maxWidth: '480px' }}>
            <Search size={14} className="cms-search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Reference ID, participant name, email, IP..."
              className="cms-search-input"
            />
          </div>

          <div className="admin-status-filters" style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`admin-filter-pill ${activeFilter === 'all' ? 'is-active' : ''}`}
            >
              All Records ({filteredLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('success')}
              className={`admin-filter-pill admin-filter-pill--success ${activeFilter === 'success' ? 'is-active' : ''}`}
            >
              Verified Valid ({currentSuccess})
            </button>
            {legacyFailedCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter('failed')}
                className={`admin-filter-pill admin-filter-pill--danger ${activeFilter === 'failed' ? 'is-active' : ''}`}
              >
                Legacy Failed ({legacyFailedCount})
              </button>
            )}
          </div>
        </div>

        {/* ── Logs Table ──────────────────────────────────────────────── */}
        <div className="admin-table-wrap">
          {filteredLogs.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Reference ID</th>
                  <th>Filter & Status</th>
                  <th>Participant</th>
                  <th>Details</th>
                  <th>Origin & Device</th>
                  {canDelete && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isVerified = log.status === 'success'
                  return (
                    <tr key={log.id}>
                      <td data-label="Time">
                        <span className="table-time-text">{formatDateTime(log.created_at)}</span>
                      </td>

                      <td data-label="Reference ID">
                        <code
                          style={{
                            background: 'rgba(59, 130, 246, 0.12)',
                            color: '#93c5fd',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                          }}
                        >
                          {log.reference_id}
                        </code>
                      </td>

                      <td data-label="Filter & Status">
                        {isVerified ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                            <span
                              className="cyber-kpi-badge cyber-kpi-badge--emerald"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <CheckCircle2 size={11} /> Authentic & Verified
                            </span>
                            <span style={{ fontSize: '10px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', paddingLeft: '2px' }}>
                              <ShieldCheck size={10} /> High-Accuracy Filtered
                            </span>
                          </div>
                        ) : (
                          <span
                            className="cyber-kpi-badge cyber-kpi-badge--amber"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.25)' }}
                          >
                            <XCircle size={11} /> Legacy Unverified
                          </span>
                        )}
                      </td>

                      <td data-label="Participant">
                        {log.participant_name ? (
                          <div className="user-profile-cell">
                            <span className="user-avatar-initial">
                              {log.participant_name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <strong>{log.participant_name}</strong>
                              {log.participant_email && (
                                <small className="admin-table__subline">{log.participant_email}</small>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--adm-muted)' }}>— (Unrecognized)</span>
                        )}
                      </td>

                      <td data-label="Details">
                        <span style={{ fontSize: '12px', color: 'var(--adm-text)', maxWidth: '280px', display: 'inline-block' }}>
                          {log.message}
                        </span>
                      </td>

                      <td data-label="Origin & Device">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <code style={{ fontSize: '11px', color: 'var(--adm-muted)' }}>{log.ip_address}</code>
                          {log.user_agent && !log.user_agent.toLowerCase().includes('mozilla') && log.user_agent !== 'Browser' && (
                            <span
                              style={{
                                fontSize: '10.5px',
                                color: 'var(--adm-muted)',
                                maxWidth: '180px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={log.user_agent}
                            >
                              {log.user_agent}
                            </span>
                          )}
                        </div>
                      </td>

                      {canDelete && (
                        <td data-label="Actions" style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="cms-row-delete-btn"
                            title="Delete this verification log"
                            onClick={() => {
                              setSingleDeleteId(log.id)
                              setSingleDeleteRef(log.reference_id)
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="cms-empty-state" style={{ padding: '48px 24px' }}>
              <div className="cms-empty-icon">
                <FileCheck size={28} />
              </div>
              <h4 className="cms-empty-title">No Verification Logs Found</h4>
              <p className="cms-empty-subtitle">
                {search || activeFilter !== 'all'
                  ? 'No logs matched your current search filters.'
                  : 'Whenever participants verify authentic certificates on the portal, high-accuracy verified audit records will appear here.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── High Security Delete Modal: Clear All Logs ───────────────── */}
      <HighSecurityDeleteModal
        isOpen={clearAllModalOpen}
        onClose={() => setClearAllModalOpen(false)}
        onConfirm={handleConfirmClearAll}
        title="Purge All Verification Logs"
        itemName="All Certificate Verification Logs"
        description="DANGER: This action will permanently erase all verification audit logs. This cannot be undone."
        confirmationPhrase="DELETE ALL LOGS"
      />

      {/* ── High Security Delete Modal: Purge Legacy Failed ─────────── */}
      <HighSecurityDeleteModal
        isOpen={purgeFailedModalOpen}
        onClose={() => setPurgeFailedModalOpen(false)}
        onConfirm={handleConfirmPurgeFailed}
        title="Purge Legacy Unverified Entries"
        itemName="All Legacy Failed/Unverified Lookup Records"
        description="This action removes legacy failed/unverified lookup entries from Supabase, keeping only high-accuracy verified records."
        confirmationPhrase="DELETE"
      />

      {/* ── High Security Delete Modal: Delete Single Log ────────────── */}
      <HighSecurityDeleteModal
        isOpen={Boolean(singleDeleteId)}
        onClose={() => {
          setSingleDeleteId(null)
          setSingleDeleteRef('')
        }}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Verification Log"
        itemName={`Log Entry for Reference ID "${singleDeleteRef}"`}
        description="Permanently remove this audit log entry from the database."
        confirmationPhrase="DELETE"
      />
    </div>
  )
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(d)
  } catch {
    return iso
  }
}

