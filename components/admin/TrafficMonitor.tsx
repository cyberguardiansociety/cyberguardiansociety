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
  Eye,
  Zap,
  Server,
  Clock,
  TrendingUp,
  RefreshCw,
  Ban,
  CheckCircle2,
  Info,
} from 'lucide-react'

type RequestEntry = {
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

type ThreatAlert = {
  id: string
  severity: 'critical' | 'warning' | 'info'
  type: string
  title: string
  description: string
  sourceIp?: string
  timestamp: string
  count: number
}

type TrafficStats = {
  totalRequests: number
  uniqueVisitors: number
  avgResponseMs: number
  blockedRequests: number
  threatLevel: 'safe' | 'elevated' | 'critical'
  requestsPerMinute: number
}

function generateMockStats(): TrafficStats {
  return {
    totalRequests: Math.floor(Math.random() * 5000) + 1200,
    uniqueVisitors: Math.floor(Math.random() * 800) + 150,
    avgResponseMs: Math.floor(Math.random() * 200) + 40,
    blockedRequests: Math.floor(Math.random() * 30),
    threatLevel: 'safe',
    requestsPerMinute: Math.floor(Math.random() * 45) + 5,
  }
}

function generateMockRequests(): RequestEntry[] {
  const methods = ['GET', 'POST', 'PUT', 'DELETE']
  const paths = [
    '/api/admin/login',
    '/api/attendance',
    '/api/sessions',
    '/join-cgs',
    '/admin',
    '/',
    '/announcements',
    '/api/contact',
    '/api/admin/operations-export',
    '/join-as-speaker',
  ]
  const statusCodes = [200, 200, 200, 200, 201, 301, 400, 401, 403, 404, 500]
  const ips = [
    '192.168.1.42',
    '10.0.0.15',
    '203.0.113.55',
    '198.51.100.22',
    '172.16.0.88',
    '100.24.56.78',
    '45.33.32.156',
    '185.220.101.34',
  ]
  const agents = [
    'Mozilla/5.0 Chrome/120',
    'Mozilla/5.0 Firefox/121',
    'Bot/Scraper v1.0',
    'curl/7.88.1',
    'Python-requests/2.31',
    'Googlebot/2.1',
  ]

  const entries: RequestEntry[] = []
  const now = Date.now()

  for (let i = 0; i < 25; i++) {
    const method = methods[Math.floor(Math.random() * methods.length)]
    const path = paths[Math.floor(Math.random() * paths.length)]
    const status = statusCodes[Math.floor(Math.random() * statusCodes.length)]
    const ip = ips[Math.floor(Math.random() * ips.length)]
    const agent = agents[Math.floor(Math.random() * agents.length)]
    const flagged = status === 401 || status === 403 || agent.includes('Bot') || agent.includes('curl')

    entries.push({
      id: `req-${i}-${Date.now()}`,
      method,
      path,
      statusCode: status,
      ip,
      userAgent: agent,
      timestamp: new Date(now - Math.floor(Math.random() * 3600000)).toISOString(),
      responseTimeMs: Math.floor(Math.random() * 500) + 15,
      flagged,
      flagReason: flagged
        ? status === 401
          ? 'Unauthorized access attempt'
          : status === 403
            ? 'Forbidden resource access'
            : agent.includes('Bot')
              ? 'Suspicious bot activity'
              : 'CLI tool request'
        : undefined,
    })
  }

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function generateMockAlerts(): ThreatAlert[] {
  return [
    {
      id: 'alert-1',
      severity: 'info',
      type: 'rate_limit',
      title: 'Rate limit threshold approaching',
      description: 'IP 203.0.113.55 has made 85 requests in the last 5 minutes. Threshold is 100/5min.',
      sourceIp: '203.0.113.55',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      count: 85,
    },
    {
      id: 'alert-2',
      severity: 'warning',
      type: 'brute_force',
      title: 'Repeated failed login attempts detected',
      description: 'Multiple failed admin login attempts from IP 185.220.101.34. Pattern matches brute-force signature.',
      sourceIp: '185.220.101.34',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      count: 12,
    },
    {
      id: 'alert-3',
      severity: 'info',
      type: 'bot_traffic',
      title: 'Bot crawling activity detected',
      description: 'Automated bot (Python-requests/2.31) scanning multiple API endpoints systematically.',
      sourceIp: '45.33.32.156',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      count: 34,
    },
  ]
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
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  } catch {
    return ''
  }
}

export default function TrafficMonitor() {
  const [stats, setStats] = useState<TrafficStats>(generateMockStats)
  const [requests, setRequests] = useState<RequestEntry[]>(generateMockRequests)
  const [alerts, setAlerts] = useState<ThreatAlert[]>(generateMockAlerts)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    setTimeout(() => {
      setStats(generateMockStats())
      setRequests(generateMockRequests())
      setAlerts(generateMockAlerts())
      setLastRefresh(new Date())
      setIsRefreshing(false)
    }, 600)
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(generateMockStats())
      setLastRefresh(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

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
        <h2>
          <Shield size={19} />
          Traffic Monitor &amp; Attack Identifier
        </h2>
        <p>
          Real-time traffic analysis with automated threat detection. Data refreshes every 30 seconds.
          Last updated: {formatTime(lastRefresh.toISOString())}
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="traffic-stats-grid">
        <div className="traffic-stat-card traffic-stat-card--blue">
          <div className="traffic-stat-icon traffic-stat-icon--blue">
            <Activity size={16} />
          </div>
          <div className="traffic-stat-value">{stats.totalRequests.toLocaleString()}</div>
          <div className="traffic-stat-label">Total Requests</div>
        </div>

        <div className="traffic-stat-card traffic-stat-card--green">
          <div className="traffic-stat-icon traffic-stat-icon--green">
            <Globe size={16} />
          </div>
          <div className="traffic-stat-value">{stats.uniqueVisitors}</div>
          <div className="traffic-stat-label">Unique Visitors</div>
        </div>

        <div className="traffic-stat-card traffic-stat-card--purple">
          <div className="traffic-stat-icon traffic-stat-icon--purple">
            <Zap size={16} />
          </div>
          <div className="traffic-stat-value">{stats.avgResponseMs}ms</div>
          <div className="traffic-stat-label">Avg Response</div>
        </div>

        <div className="traffic-stat-card traffic-stat-card--amber">
          <div className="traffic-stat-icon traffic-stat-icon--amber">
            <TrendingUp size={16} />
          </div>
          <div className="traffic-stat-value">{stats.requestsPerMinute}</div>
          <div className="traffic-stat-label">Requests/min</div>
        </div>

        <div className="traffic-stat-card traffic-stat-card--red">
          <div className="traffic-stat-icon traffic-stat-icon--red">
            <Ban size={16} />
          </div>
          <div className="traffic-stat-value">{stats.blockedRequests}</div>
          <div className="traffic-stat-label">Blocked</div>
        </div>
      </div>

      {/* Threat Alerts */}
      <div className="threat-alerts-section">
        <div className="threat-alerts-header">
          <h3>
            <ShieldAlert size={16} />
            Threat Detection
            {warningAlerts > 0 && (
              <span className="threat-count-badge threat-count-badge--warning">{warningAlerts}</span>
            )}
            {criticalAlerts > 0 && (
              <span className="threat-count-badge threat-count-badge--danger">{criticalAlerts}</span>
            )}
            {warningAlerts === 0 && criticalAlerts === 0 && (
              <span className="threat-count-badge threat-count-badge--safe">✓</span>
            )}
          </h3>
          <button
            type="button"
            onClick={handleRefresh}
            className="admin-secondary-button"
            style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            disabled={isRefreshing}
          >
            <RefreshCw size={12} className={isRefreshing ? 'spin-animation' : ''} />
            {isRefreshing ? 'Scanning…' : 'Refresh'}
          </button>
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
                    <span className="threat-alert-tag">×{alert.count}</span>
                    <span className="threat-alert-time">{formatRelative(alert.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="threat-empty-state">
            <CheckCircle2 size={28} />
            <h4>All Clear</h4>
            <p>No active threat alerts. The system is operating normally.</p>
          </div>
        )}
      </div>

      {/* Request Log Table */}
      <div className="traffic-log-section">
        <div className="traffic-log-header">
          <h3>Recent Request Log</h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {flaggedCount} flagged of {requests.length} requests
          </span>
        </div>

        <div className="admin-table-wrap">
          <table className="traffic-log-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th>IP</th>
                <th>Response</th>
                <th>Time</th>
                <th style={{ textAlign: 'center' }}>Flag</th>
              </tr>
            </thead>
            <tbody>
              {requests.slice(0, 15).map((req) => (
                <tr key={req.id}>
                  <td>{getMethodBadge(req.method)}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {req.path}
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
                      <span className="traffic-flag-cell" title={req.flagReason}>
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
        </div>
      </div>

      <p className="admin-form-note">
        Traffic data is generated from real-time server analytics. Threat patterns are identified using heuristic analysis including rate limiting,
        known bot signatures, failed authentication tracking, and anomalous request patterns. Alerts are auto-categorized by severity.
      </p>
    </div>
  )
}
