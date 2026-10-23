import fs from 'node:fs'
import path from 'node:path'
import initSqlJs from 'sql.js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!supabaseUrl || !supabaseSecret || supabaseSecret.includes('replace-with')) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY before running the local data migration.')
}
const parsedSupabaseUrl = new URL(supabaseUrl)
if (parsedSupabaseUrl.protocol !== 'https:' && parsedSupabaseUrl.hostname !== 'localhost') {
  throw new Error('The Supabase URL must use HTTPS.')
}
if (supabaseSecret.startsWith('sb_publishable_')) {
  throw new Error('A server-side Supabase secret key is required for this migration.')
}

const databasePath = fs.existsSync(path.join(process.cwd(), 'cgs.db'))
  ? path.join(process.cwd(), 'cgs.db')
  : path.join(process.cwd(), 'data', 'cgs.db')
if (!fs.existsSync(databasePath)) throw new Error('The local SQLite database file was not found.')

const SQL = await initSqlJs({
  locateFile: (filename) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', filename),
})
const database = new SQL.Database(new Uint8Array(fs.readFileSync(databasePath)))

const tableOrder = [
  ['cgs_google_sheet_connections', 'id'],
  ['admin_users', 'user_id'],
  ['online_sessions', 'id'],
  ['cgs_speakers', 'id'],
  ['cgs_registrants', 'id'],
  ['cgs_managed_content', 'id'],
  ['cgs_inbox_messages', 'id'],
  ['cgs_portal_settings', 'key'],
  ['cgs_payment_ledger', 'id'],
  ['applications', 'id'],
  ['cgs_session_speakers', 'id'],
  ['cgs_session_registrations', 'id'],
  ['cgs_attendance_records', 'id'],
  ['cgs_google_sync_runs', 'id'],
  ['admin_audit_log', 'id'],
]

const jsonColumns = new Set([
  'admin_users.permission_keys',
  'admin_audit_log.details',
  'cgs_speakers.social_links',
  'cgs_inbox_messages.metadata',
  'cgs_google_sync_runs.details',
])
const booleanColumns = new Set([
  'admin_users.active', 'admin_users.is_protected',
  'online_sessions.is_published', 'online_sessions.is_active',
  'online_sessions.registration_open', 'online_sessions.attendance_open',
  'cgs_speakers.is_active', 'cgs_google_sheet_connections.is_active',
])
const timeColumns = /(?:^|_)(?:at|until)$/

function convertRow(table, row) {
  const converted = { ...row }
  for (const [column, value] of Object.entries(converted)) {
    if (booleanColumns.has(`${table}.${column}`) && value !== null) {
      converted[column] = value === true || value === 1 || value === '1'
    }
    if (jsonColumns.has(`${table}.${column}`) && typeof value === 'string') {
      try { converted[column] = JSON.parse(value) } catch {}
    }
    if (jsonColumns.has(`${table}.${column}`) && converted[column] == null) converted[column] = {}
    if (timeColumns.test(column) && typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
      converted[column] = `${value.replace(' ', 'T')}Z`
    }
  }
  if (table === 'admin_users' && !Array.isArray(converted.permission_keys)) converted.permission_keys = []
  return converted
}

function readRows(table) {
  try {
    const statement = database.prepare(`SELECT * FROM "${table}"`)
    const rows = []
    try {
      while (statement.step()) rows.push(convertRow(table, statement.getAsObject()))
    } finally {
      statement.free()
    }
    return rows
  } catch {
    return null
  }
}

function makeHeaders(extra = {}) {
  const headers = new Headers({ apikey: supabaseSecret, ...extra })
  if (!supabaseSecret.startsWith('sb_secret_')) headers.set('authorization', `Bearer ${supabaseSecret}`)
  return headers
}

async function requestJson(url, options, context) {
  const response = await fetch(url, { ...options, cache: 'no-store' })
  const text = response.status === 204 ? '' : await response.text()
  let data = null
  if (text) {
    try { data = JSON.parse(text) } catch {}
  }
  if (!response.ok) throw new Error(`${context} failed (HTTP ${response.status}).`)
  return data
}

const chunks = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))
let migratedRows = 0

for (const [table, conflictColumn] of tableOrder) {
  const rows = readRows(table)
  if (rows === null || rows.length === 0) continue

  for (const batch of chunks(rows, 100)) {
    const endpoint = new URL(`${supabaseUrl}/rest/v1/${table}`)
    endpoint.searchParams.set('on_conflict', conflictColumn)
    await requestJson(endpoint, {
      method: 'POST',
      headers: makeHeaders({
        'content-type': 'application/json',
        prefer: `${table === 'admin_users' ? 'resolution=ignore-duplicates' : 'resolution=merge-duplicates'},return=minimal`,
      }),
      body: JSON.stringify(batch),
    }, `Import to ${table}`)

    const identifiers = batch.map((row) => row[conflictColumn]).filter((value) => value !== undefined && value !== null)
    if (identifiers.length !== batch.length) throw new Error(`Rows in ${table} are missing their conflict key.`)
    const verification = new URL(`${supabaseUrl}/rest/v1/${table}`)
    verification.searchParams.set('select', conflictColumn)
    verification.searchParams.set(conflictColumn, `in.(${identifiers.join(',')})`)
    const verifiedRows = await requestJson(verification, {
      method: 'GET', headers: makeHeaders({ accept: 'application/json' }),
    }, `Verification for ${table}`)
    if (!Array.isArray(verifiedRows) || verifiedRows.length !== batch.length) {
      throw new Error(`Imported rows in ${table} could not be verified.`)
    }
    migratedRows += batch.length
  }
  console.log(`Imported and verified ${rows.length} row(s) in ${table}.`)
}

database.close()
console.log(`Local database migration complete: ${migratedRows} row(s) imported and verified.`)
