'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Activity,
  Globe,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Zap,
  Clock,
  TrendingUp,
  RefreshCw,
  Ban,
  CheckCircle2,
  Info,
  Trash2,
  X,
  Loader2,
} from 'lucide-react'

export type RequestEntry = {
  id: string
  method: string
  path: string
  statusCode: number
  ip: string
  userAgent: string
  timestamp: string
  responseTimeMs: number
  flagged: boolean
  flagReason?: string
}

export type ThreatAlert = {
  id: string
  severity: 'critical' | 'warning' | 'info'
  type: string
  title: string
  description: string
  sourceIp?: string
  timestamp: string
  count: number
}

export type TrafficStats = {
  totalRequests: number
  uniqueVisitors: number
  avgResponseMs: number
  blockedRequests: number
  threatLevel: 'safe' | 'elevated' | 'critical'
  requestsPerMinute: number
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('en', { timeStyle: 'medium', hour12: false }).format(d)
  } catch {
    return iso
  }
}

function formatRelative(iso: string) {
  try {
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return `${Math.max(1, diff)}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return ''
  }
}

export default function TrafficMonitor() {
  const [stats, setStats] = useState<TrafficStats>({
    totalRequests: 0,
    uniqueVisitors: 0,
    avgResponseMs: 0,
    blockedRequests: 0,
    threatLevel: 'safe',
    requestsPerMinute: 0,
  })
  const [requests, setRequests] = useState<RequestEntry[]>([])
  const [alerts, setAlerts] = useState<ThreatAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  // Fetch real traffic from the live security recorder
  const fetchRealTraffic = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    try {
      const res = await fetch('/api/admin/traffic', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats || {
          totalRequests: 0,
          uniqueVisitors: 0,
          avgResponseMs: 0,
          blockedRequests: 0,
          threatLevel: 'safe',
          requestsPerMinute: 0,
        })
        setRequests(data.requests || [])
        setAlerts(data.alerts || [])
        setLastRefresh(new Date(data.lastUpdated || Date.now()))
      }
    } catch (err) {
      console.warn('[TrafficMonitor] Failed to fetch real traffic:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Auto-refresh real traffic every 15 seconds
  useEffect(() => {
    fetchRealTraffic()
    const interval = setInterval(() => {
      fetchRealTraffic()
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchRealTraffic])

  // Clear notice after 4 seconds
  useEffect(() => {
    if (noticeMessage) {
      const timer = setTimeout(() => setNoticeMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [noticeMessage])

  // Delete all real traffic logs
  const handleClearLogs = async () => {
    setIsClearing(true)
    try {
      const res = await fetch('/api/admin/traffic', { method: 'DELETE' })
      if (res.ok) {
        setShowClearConfirm(false)
        setNoticeMessage('All recorded traffic logs and threat history were deleted.')
        await fetchRealTraffic()
      } else {
        setNoticeMessage('Failed to clear traffic logs. Please try again.')
      }
    } catch (err) {
      console.error('Failed to clear traffic logs:', err)
      setNoticeMessage('Network error while clearing logs.')
    } finally {
      setIsClearing(false)
    }
  };

  const flaggedCount = useMemo(() => requests.filter((r) => r.flagged).length, [requests])
  const criticalAlerts = useMemo(() => alerts.filter((a) => a.severity === 'critical').length, [alerts])
  const warningAlerts = useMemo(() => alerts.filter((a) => a.severity === 'warning').length, [alerts])

  const getMethodBadge = (method: string) => {
    const cls = `traffic-method-badge traffic-method-badge--${method.toLowerCase()}`
    return <span className={cls}>{method}</span>
  }

  const getStatusClass = (code: number) => {
    if (code < 300) return 'traffic-status-code traffic-status-code--2xx'
    if (code < 400) return 'traffic-status-code traffic-status-code--3xx'
    if (code < 500) return 'traffic-status-code traffic-status-code--4xx'
    return 'traffic-status-code traffic-status-code--5xx'
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <div className="threat-alert-icon threat-alert-icon--critical">
            <ShieldX size={14} />
          </div>
        )
      case 'warning':
        return (
          <div className="threat-alert-icon threat-alert-icon--warning">
            <AlertTriangle size={14} />
          </div>
        )
      default:
        return (
          <div className="threat-alert-icon threat-alert-icon--info">
            <Info size={14} />
          </div>
        )
    }
  }

  return (
    <div className="traffic-monitor">
      {/* Header */}
      <div className="traffic-monitor__header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2>
              <Shield size={19} />
              Real-Time Traffic Monitor &amp; Threat Detection
            </h2>
            <p>
              Live production telemetry monitoring real visitor, admin, and bot traffic.
              Last synced: <strong>{formatTime(lastRefresh.toISOString())}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => fetchRealTraffic(true)}
              className="admin-secondary-button"
              style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              disabled={isRefreshing || isLoading}
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin-animation' : ''} />
              {isRefreshing ? 'Scanning…' : 'Sync Live'}
            </button>
          </div>
        </div>

        {noticeMessage && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#93c5fd',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={14} />
            <span>{noticeMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="traffic-stats-grid">
        <div className="traffic-stat-card traffic-stat-card--blue">
          <div className="traffic-stat-icon traffic-stat-icon--blue">
            <Activity size={16} />
          </div>
          <div className="traffic-stat-value">{stats.totalRequests.toLocaleString()}</div>
          <div className="traffic-stat-label">Total Real Requests</div>
        </div>

        <div className="traffic-stat-card traffic-stat-card--green">
          <div className="traffic-stat-icon traffic-stat-icon--green">
            <Globe size={16} />
          </div>
          <div className="traffic-stat-value">{stats.uniqueVisitors}</div>
          <div className="traffic-stat-label">Unique IP Visitors</div>
        </div>

        <div className="traffic-stat-card traffic-stat-card--purple">
          <div className="traffic-stat-icon traffic-stat-icon--purple">
            <Zap size={16} />
          </div>
          <div className="traffic-stat-value">{stats.avgResponseMs}ms</div>
          <div className="traffic-stat-label">Avg Latency</div>
        </div>

        <div className="traffic-stat-card traffic-stat-card--amber">
          <div className="traffic-stat-icon traffic-stat-icon--amber">
            <TrendingUp size={16} />
          </div>
          <div className="traffic-stat-value">{stats.requestsPerMinute}</div>
          <div className="traffic-stat-label">Active Req/min</div>
        </div>

        <div className="traffic-stat-card traffic-stat-card--red">
          <div className="traffic-stat-icon traffic-stat-icon--red">
            <Ban size={16} />
          </div>
          <div className="traffic-stat-value">{stats.blockedRequests}</div>
          <div className="traffic-stat-label">Blocked / Denied</div>
        </div>
      </div>

      {/* Threat Alerts Section */}
      <div className="threat-alerts-section">
        <div className="threat-alerts-header">
          <h3>
            <ShieldAlert size={16} />
            Active Threat Detection
            {warningAlerts > 0 && (
              <span className="threat-count-badge threat-count-badge--warning">{warningAlerts} warnings</span>
            )}
            {criticalAlerts > 0 && (
              <span className="threat-count-badge threat-count-badge--danger">{criticalAlerts} critical</span>
            )}
            {warningAlerts === 0 && criticalAlerts === 0 && (
              <span className="threat-count-badge threat-count-badge--safe">✓ 0 Threats</span>
            )}
          </h3>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {alerts.length === 0 ? 'Normal operations' : `${alerts.length} threat patterns captured`}
          </span>
        </div>

        {alerts.length > 0 ? (
          <div className="threat-alert-list">
            {alerts.map((alert) => (
              <div key={alert.id} className={`threat-alert-item threat-alert-item--${alert.severity}`}>
                {getSeverityIcon(alert.severity)}
                <div className="threat-alert-body">
                  <p className="threat-alert-title">{alert.title}</p>
                  <p className="threat-alert-desc">{alert.description}</p>
                  <div className="threat-alert-meta">
                    <span className="threat-alert-tag">{alert.type.replaceAll('_', ' ')}</span>
                    {alert.sourceIp && <span className="threat-alert-tag">IP: {alert.sourceIp}</span>}
                    <span className="threat-alert-tag">×{alert.count} hits</span>
                    <span className="threat-alert-time">{formatRelative(alert.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="threat-empty-state">
            <CheckCircle2 size={26} />
            <h4>All Clear · No Threats Detected</h4>
            <p>Real-time heuristic scanning is active. No malicious probes, injections, or unauthorized attempts.</p>
          </div>
        )}
      </div>

      {/* Request Log Section with Delete / Clear button in stats bar */}
      <div className="traffic-log-section">
        <div className="traffic-log-header">
          <div>
            <h3>Recent Request Log</h3>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
              <strong>{requests.length}</strong> real requests logged · <strong>{flaggedCount}</strong> flagged
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Delete / Clear Logs button */}
            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="admin-danger-button"
                style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Permanently clear all recorded request logs"
                disabled={requests.length === 0}
              >
                <Trash2 size={13} />
                <span>Clear request logs</span>
              </button>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <span style={{ fontSize: '11px', color: '#fca5a5' }}>Confirm delete?</span>
                <button
                  type="button"
                  onClick={handleClearLogs}
                  disabled={isClearing}
                  className="admin-danger-button"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  {isClearing ? <Loader2 size={12} className="spin-animation" /> : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="admin-secondary-button"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Requests Table or Empty State */}
        <div className="admin-table-wrap">
          {requests.length > 0 ? (
            <table className="traffic-log-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>IP</th>
                  <th>Latency</th>
                  <th>Time</th>
                  <th style={{ textAlign: 'center' }}>Threat</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 30).map((req) => (
                  <tr key={req.id}>
                    <td>{getMethodBadge(req.method)}</td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span title={req.path}>{req.path}</span>
                    </td>
                    <td>
                      <span className={getStatusClass(req.statusCode)}>{req.statusCode}</span>
                    </td>
                    <td className="traffic-ip-cell">{req.ip}</td>
                    <td>{req.responseTimeMs}ms</td>
                    <td>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatRelative(req.timestamp)}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {req.flagged ? (
                        <span className="traffic-flag-cell" title={req.flagReason || 'Flagged anomalous request'}>
                          <AlertTriangle size={13} className="traffic-flag-icon" />
                        </span>
                      ) : (
                        <span style={{ opacity: 0.3 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <Clock size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>No request logs recorded</p>
              <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                Incoming visitor, administrator, and bot traffic will be logged here in real time.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="admin-form-note">
        Traffic and security metrics reflect actual HTTP requests handled by the platform. Threats are evaluated across honeypot decoy hits,
        path traversal patterns, known bot signatures, and unauthorized access attempts.
      </p>
    </div>
  )
}
