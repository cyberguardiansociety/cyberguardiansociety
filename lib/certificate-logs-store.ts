import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export type CertificateVerificationLog = {
  id: string
  reference_id: string
  participant_name: string | null
  participant_email: string | null
  status: 'success' | 'failed'
  message: string
  ip_address: string
  user_agent: string
  created_at: string
}

const LOGS_FILE = path.join(process.cwd(), 'data', 'certificate-verification-logs.json')

function ensureDataDir() {
  const dir = path.dirname(LOGS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readLogsFromFile(): CertificateVerificationLog[] {
  try {
    ensureDataDir()
    if (!fs.existsSync(LOGS_FILE)) return []
    const content = fs.readFileSync(LOGS_FILE, 'utf-8')
    if (!content.trim()) return []
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? (parsed as CertificateVerificationLog[]) : []
  } catch (err) {
    console.error('[certificate-logs-store] Error reading verification logs:', err)
    return []
  }
}

function writeLogsToFile(logs: CertificateVerificationLog[]) {
  try {
    ensureDataDir()
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8')
  } catch (err) {
    console.error('[certificate-logs-store] Error writing verification logs:', err)
  }
}

/**
 * Records a verification attempt (both success and failed attempts).
 */
export async function logVerificationAttempt(entry: {
  reference_id: string
  participant_name?: string | null
  participant_email?: string | null
  status: 'success' | 'failed'
  message: string
  ip_address?: string
  user_agent?: string
}): Promise<CertificateVerificationLog> {
  const newLog: CertificateVerificationLog = {
    id: randomUUID(),
    reference_id: entry.reference_id || 'UNKNOWN',
    participant_name: entry.participant_name || null,
    participant_email: entry.participant_email || null,
    status: entry.status,
    message: entry.message,
    ip_address: entry.ip_address || '127.0.0.1',
    user_agent: entry.user_agent || 'Browser',
    created_at: new Date().toISOString(),
  }

  // 1. Save to JSON store
  const logs = readLogsFromFile()
  logs.unshift(newLog)
  // Keep the latest 2000 logs
  if (logs.length > 2000) logs.length = 2000
  writeLogsToFile(logs)

  return newLog
}

/**
 * Retrieves logs with optional search, status filtering, and limit.
 */
export async function getCertificateLogs(options?: {
  query?: string
  status?: string
  limit?: number
}): Promise<CertificateVerificationLog[]> {
  const logs = readLogsFromFile()
  const q = (options?.query || '').trim().toLowerCase()
  const statusFilter = (options?.status || '').trim().toLowerCase()

  let filtered = logs

  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter((log) => log.status === statusFilter)
  }

  if (q) {
    filtered = filtered.filter((log) =>
      log.reference_id.toLowerCase().includes(q) ||
      (log.participant_name && log.participant_name.toLowerCase().includes(q)) ||
      (log.participant_email && log.participant_email.toLowerCase().includes(q)) ||
      log.ip_address.toLowerCase().includes(q) ||
      log.message.toLowerCase().includes(q)
    )
  }

  const limit = options?.limit || 200
  return filtered.slice(0, limit)
}

/**
 * Returns stats for the verification logs.
 */
export async function getCertificateLogsStats(): Promise<{
  total: number
  success: number
  failed: number
  successRate: number
}> {
  const logs = readLogsFromFile()
  const total = logs.length
  const success = logs.filter((l) => l.status === 'success').length
  const failed = logs.filter((l) => l.status === 'failed').length
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0

  return { total, success, failed, successRate }
}

/**
 * Deletes a single verification log by ID.
 */
export async function deleteCertificateLog(id: string): Promise<boolean> {
  const logs = readLogsFromFile()
  const filtered = logs.filter((l) => l.id !== id)
  if (filtered.length !== logs.length) {
    writeLogsToFile(filtered)
    return true
  }
  return false
}

/**
 * Clears ALL verification logs from storage.
 */
export async function clearAllCertificateLogs(): Promise<number> {
  const logs = readLogsFromFile()
  const count = logs.length
  writeLogsToFile([])
  return count
}
