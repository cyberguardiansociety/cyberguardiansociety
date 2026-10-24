import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

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
  try {
    const dir = path.dirname(LOGS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch {}
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
    return []
  }
}

function writeLogsToFile(logs: CertificateVerificationLog[]) {
  try {
    ensureDataDir()
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8')
  } catch (err) {
    // Read-only filesystem in serverless environments (e.g. Vercel) is safely ignored
  }
}

/**
 * High-accuracy validation filter for certificate verification attempts.
 * Ensures that only authentic, confirmed, and properly formatted certificate
 * verifications are permitted to be recorded into the Supabase database (admin_audit_log)
 * and certificate verification logs.
 */
export function isHighAccuracyValidVerification(entry: {
  status?: string | null
  reference_id?: string | null
  participant_name?: string | null
  participant_email?: string | null
  message?: string | null
}): boolean {
  if (!entry) return false

  // 1. Strict status check: only successful verifications are valid
  if (entry.status !== 'success') {
    return false
  }

  // 2. Reference ID validation: must be non-empty and cannot be placeholder/invalid values
  const rawRef = (entry.reference_id || '').trim().toUpperCase()
  if (!rawRef || rawRef === 'EMPTY' || rawRef === 'UNKNOWN' || rawRef === 'NULL' || rawRef === 'UNDEFINED') {
    return false
  }

  // Reference ID must have sensible length (between 4 and 64 characters)
  if (rawRef.length < 4 || rawRef.length > 64) {
    return false
  }

  // Must only contain valid characters (alphanumeric, dashes, underscores)
  if (!/^[A-Z0-9_-]+$/i.test(rawRef)) {
    return false
  }

  // 3. Participant name validation: must be a legitimate non-empty name
  const name = (entry.participant_name || '').trim()
  if (!name || name.length < 2) {
    return false
  }
  const lowerName = name.toLowerCase()
  if (lowerName === 'null' || lowerName === 'undefined' || lowerName === 'unrecognized' || lowerName === 'unknown') {
    return false
  }

  // 4. Message integrity check: must not be a failure/error message
  if (entry.message) {
    const lowerMsg = entry.message.toLowerCase()
    if (
      lowerMsg.includes('no certificate found') ||
      lowerMsg.includes('empty certificate') ||
      lowerMsg.includes('failed') ||
      lowerMsg.includes('invalid')
    ) {
      return false
    }
  }

  return true
}

/**
 * Records a verification attempt with High-Accuracy Filtering.
 * Only VALID, authenticated certificate verifications (status: 'success')
 * are recorded into Supabase (admin_audit_log) and local logs.
 * All invalid queries, failed lookups, and unverified attempts are filtered out.
 */
export async function logVerificationAttempt(entry: {
  reference_id: string
  participant_name?: string | null
  participant_email?: string | null
  status: 'success' | 'failed'
  message: string
  ip_address?: string
  user_agent?: string
}): Promise<CertificateVerificationLog | null> {
  // HIGH-ACCURACY FILTER:
  // Reject any invalid, failed, or malformed verification attempts.
  // ONLY valid certificate verifications are recorded into the database and logs.
  if (!isHighAccuracyValidVerification(entry)) {
    return null
  }

  const newLog: CertificateVerificationLog = {
    id: randomUUID(),
    reference_id: (entry.reference_id || 'UNKNOWN').trim().toUpperCase(),
    participant_name: entry.participant_name || null,
    participant_email: entry.participant_email || null,
    status: 'success',
    message: entry.message,
    ip_address: entry.ip_address || '127.0.0.1',
    user_agent: entry.user_agent || 'Browser',
    created_at: new Date().toISOString(),
  }

  // 1. Primary: Save to Database (admin_audit_log)
  try {
    const supabase = createSupabaseServiceClient()
    const { error } = await supabase.from('admin_audit_log').insert({
      id: newLog.id,
      actor_id: 'system',
      action: 'certificate_verify_success',
      entity: 'certificate_verification',
      entity_id: newLog.reference_id,
      details: {
        reference_id: newLog.reference_id,
        participant_name: newLog.participant_name,
        participant_email: newLog.participant_email,
        status: 'success',
        verified: true,
        high_accuracy_filter_passed: true,
        message: newLog.message,
        ip_address: newLog.ip_address,
        user_agent: newLog.user_agent,
      },
      created_at: newLog.created_at,
    })

    if (error) {
      console.warn('[certificate-logs-store] DB insert warning:', error.message)
    }
  } catch (dbErr) {
    console.warn('[certificate-logs-store] DB insert exception:', dbErr)
  }

  // 2. Secondary: Save to local JSON file (works in local dev environments)
  try {
    const logs = readLogsFromFile()
    logs.unshift(newLog)
    if (logs.length > 2000) logs.length = 2000
    writeLogsToFile(logs)
  } catch {}

  return newLog
}

/**
 * Retrieves logs with high-accuracy filtering, optional search, and limit.
 * Reads from the database (admin_audit_log), merged with local JSON logs.
 * By default, applies the high-accuracy filter so ONLY authentic, valid records are returned.
 */
export async function getCertificateLogs(options?: {
  query?: string
  status?: string
  limit?: number
  validOnly?: boolean
}): Promise<CertificateVerificationLog[]> {
  const combinedLogs: CertificateVerificationLog[] = []
  const seenIds = new Set<string>()
  const validOnly = options?.validOnly !== false // defaults to true for high accuracy

  // 1. Fetch from Database (admin_audit_log)
  try {
    const supabase = createSupabaseServiceClient()
    let dbQuery = supabase
      .from('admin_audit_log')
      .select('id, actor_id, action, entity, entity_id, details, created_at')
      .eq('entity', 'certificate_verification')
      .order('created_at', { ascending: false })
      .limit(options?.limit || 500)

    if (validOnly) {
      dbQuery = dbQuery.eq('action', 'certificate_verify_success')
    }

    const { data, error } = await dbQuery

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        let details: any = row.details
        if (typeof details === 'string') {
          try {
            details = JSON.parse(details)
          } catch {
            details = {}
          }
        } else if (!details || typeof details !== 'object') {
          details = {}
        }

        const isSuccess =
          row.action === 'certificate_verify_success' ||
          details.status === 'success' ||
          String(row.action).includes('success')

        // If high-accuracy validOnly is active and this is not a success, skip
        if (validOnly && !isSuccess) {
          continue
        }

        const logItem: CertificateVerificationLog = {
          id: String(row.id),
          reference_id: String(details.reference_id || row.entity_id || 'UNKNOWN'),
          participant_name: details.participant_name ?? null,
          participant_email: details.participant_email ?? null,
          status: isSuccess ? 'success' : 'failed',
          message:
            details.message ||
            (isSuccess ? 'Certificate verified from CGS' : 'Certificate verification failed'),
          ip_address: details.ip_address || row.actor_id || '127.0.0.1',
          user_agent: details.user_agent || 'Browser',
          created_at: row.created_at || new Date().toISOString(),
        }

        // Apply high-accuracy validation filter to ensure integrity
        if (validOnly && !isHighAccuracyValidVerification(logItem)) {
          continue
        }

        combinedLogs.push(logItem)
        seenIds.add(logItem.id)
      }
    }
  } catch (dbErr) {
    console.warn('[certificate-logs-store] DB read warning:', dbErr)
  }

  // 2. Fallback / Merge with local JSON file
  try {
    const fileLogs = readLogsFromFile()
    for (const fLog of fileLogs) {
      if (!seenIds.has(fLog.id)) {
        if (validOnly && !isHighAccuracyValidVerification(fLog)) {
          continue
        }
        combinedLogs.push(fLog)
        seenIds.add(fLog.id)
      }
    }
  } catch {}

  // Sort descending by timestamp
  combinedLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Apply search query and status filters
  const q = (options?.query || '').trim().toLowerCase()
  const statusFilter = (options?.status || '').trim().toLowerCase()

  let filtered = combinedLogs

  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter((log) => log.status === statusFilter)
  }

  if (q) {
    filtered = filtered.filter(
      (log) =>
        log.reference_id.toLowerCase().includes(q) ||
        (log.participant_name && log.participant_name.toLowerCase().includes(q)) ||
        (log.participant_email && log.participant_email.toLowerCase().includes(q)) ||
        log.ip_address.toLowerCase().includes(q) ||
        log.message.toLowerCase().includes(q),
    )
  }

  const limit = options?.limit || 200
  return filtered.slice(0, limit)
}

/**
 * Returns stats for the verification logs with High Accuracy validation.
 */
export async function getCertificateLogsStats(): Promise<{
  total: number
  success: number
  failed: number
  successRate: number
  highAccuracyActive: boolean
}> {
  const validLogs = await getCertificateLogs({ limit: 1000, validOnly: true })
  const success = validLogs.length

  // Check if any legacy failed rows exist in database
  let legacyFailed = 0
  try {
    const supabase = createSupabaseServiceClient()
    const { count } = await supabase
      .from('admin_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('entity', 'certificate_verification')
      .eq('action', 'certificate_verify_failed')
    legacyFailed = count || 0
  } catch {}

  const total = success + legacyFailed
  const successRate = total > 0 ? Math.round((success / total) * 100) : 100

  return {
    total: success,
    success,
    failed: legacyFailed,
    successRate,
    highAccuracyActive: true,
  }
}

/**
 * Purges any legacy invalid / failed verification attempts from Supabase (admin_audit_log)
 * and local storage, ensuring only authentic, valid records remain in the database.
 */
export async function purgeInvalidCertificateLogs(): Promise<number> {
  let purgedCount = 0

  // 1. Purge from database
  try {
    const supabase = createSupabaseServiceClient()
    const { data: failedRows, error: selectErr } = await supabase
      .from('admin_audit_log')
      .select('id')
      .eq('entity', 'certificate_verification')
      .eq('action', 'certificate_verify_failed')

    if (!selectErr && failedRows && failedRows.length > 0) {
      const { error: deleteErr } = await supabase
        .from('admin_audit_log')
        .delete()
        .eq('entity', 'certificate_verification')
        .eq('action', 'certificate_verify_failed')

      if (!deleteErr) {
        purgedCount += failedRows.length
      }
    }
  } catch (err) {
    console.warn('[certificate-logs-store] Purge DB warning:', err)
  }

  // 2. Purge from local file
  try {
    const fileLogs = readLogsFromFile()
    const validOnly = fileLogs.filter((l) => isHighAccuracyValidVerification(l))
    const removedFromFile = fileLogs.length - validOnly.length
    if (removedFromFile > 0) {
      writeLogsToFile(validOnly)
      purgedCount += removedFromFile
    }
  } catch {}

  return purgedCount
}

/**
 * Deletes a single verification log by ID.
 */
export async function deleteCertificateLog(id: string): Promise<boolean> {
  let dbSuccess = false
  try {
    const supabase = createSupabaseServiceClient()
    const { error } = await supabase.from('admin_audit_log').delete().eq('id', id)
    dbSuccess = !error
  } catch {}

  try {
    const fileLogs = readLogsFromFile()
    const filtered = fileLogs.filter((l) => l.id !== id)
    if (filtered.length !== fileLogs.length) {
      writeLogsToFile(filtered)
      return true
    }
  } catch {}

  return dbSuccess
}

/**
 * Clears ALL verification logs from storage.
 */
export async function clearAllCertificateLogs(): Promise<number> {
  let count = 0
  try {
    const supabase = createSupabaseServiceClient()
    const { data } = await supabase
      .from('admin_audit_log')
      .select('id')
      .eq('entity', 'certificate_verification')
    count = data?.length || 0
    await supabase.from('admin_audit_log').delete().eq('entity', 'certificate_verification')
  } catch {}

  try {
    const fileLogs = readLogsFromFile()
    const fileCount = fileLogs.length
    writeLogsToFile([])
    count = Math.max(count, fileCount)
  } catch {}

  return count
}

