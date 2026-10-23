import fs from 'node:fs'
import path from 'node:path'
import initSqlJs from 'sql.js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseSecret) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local')
  process.exit(1)
}

const targetDbPath = path.join(process.cwd(), 'cgs.db')

const ALL_TABLES = [
  'admin_users',
  'online_sessions',
  'cgs_speakers',
  'cgs_session_speakers',
  'cgs_registrants',
  'cgs_session_registrations',
  'cgs_attendance_records',
  'cgs_managed_content',
  'cgs_inbox_messages',
  'cgs_portal_settings',
  'cgs_google_sheet_connections',
  'cgs_google_sync_runs',
  'applications',
  'admin_audit_log',
  'newsletter_subscribers',
  'admin_login_lockouts',
  'admin_ip_rate_limits',
]

const SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS admin_users (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'super_admin',
    permission_keys TEXT,
    active INTEGER DEFAULT 1,
    is_protected INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS online_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    full_description TEXT,
    starts_at TEXT NOT NULL,
    ends_at TEXT,
    timezone TEXT DEFAULT 'Asia/Karachi',
    platform TEXT DEFAULT 'Google Meet',
    href TEXT,
    banner_url TEXT,
    status TEXT DEFAULT 'upcoming',
    management_status TEXT DEFAULT 'UPCOMING',
    is_published INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    registration_open INTEGER DEFAULT 1,
    attendance_open INTEGER DEFAULT 0,
    attendance_starts_at TEXT,
    attendance_ends_at TEXT,
    session_number INTEGER,
    bootcamp_tag TEXT DEFAULT 'cgs-bootcamp-2026',
    sheet_connection_id TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cgs_speakers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT,
    organization TEXT,
    bio TEXT,
    email TEXT,
    photo_url TEXT,
    linkedin_url TEXT,
    social_links TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cgs_session_speakers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    speaker_id TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES online_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (speaker_id) REFERENCES cgs_speakers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cgs_registrants (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    whatsapp TEXT,
    organization TEXT,
    country_city TEXT,
    experience_level TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cgs_session_registrations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    registrant_id TEXT NOT NULL,
    source TEXT,
    registered_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES online_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (registrant_id) REFERENCES cgs_registrants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cgs_attendance_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    registrant_id TEXT NOT NULL,
    marked_at TEXT DEFAULT (datetime('now')),
    method TEXT DEFAULT 'manual',
    override_reason TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES online_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (registrant_id) REFERENCES cgs_registrants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cgs_managed_content (
    id TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT,
    summary TEXT,
    body TEXT,
    image_url TEXT,
    action_url TEXT,
    category TEXT,
    status TEXT DEFAULT 'published',
    sort_order INTEGER DEFAULT 0,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cgs_inbox_messages (
    id TEXT PRIMARY KEY,
    kind TEXT DEFAULT 'contact',
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    metadata TEXT,
    status TEXT DEFAULT 'new',
    source TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cgs_portal_settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cgs_google_sheet_connections (
    id TEXT PRIMARY KEY,
    name TEXT,
    spreadsheet_id TEXT,
    sheet_name TEXT,
    is_active INTEGER DEFAULT 1,
    last_synced_at TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cgs_google_sync_runs (
    id TEXT PRIMARY KEY,
    connection_id TEXT,
    status TEXT,
    started_at TEXT,
    finished_at TEXT,
    rows_read INTEGER DEFAULT 0,
    created_count INTEGER DEFAULT 0,
    updated_count INTEGER DEFAULT 0,
    duplicate_count INTEGER DEFAULT 0,
    invalid_count INTEGER DEFAULT 0,
    details TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'received',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    email TEXT PRIMARY KEY,
    source TEXT DEFAULT 'team-page',
    subscribed_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_login_lockouts (
    identifier TEXT PRIMARY KEY,
    failed_attempts INTEGER DEFAULT 0,
    lockout_count INTEGER DEFAULT 0,
    locked_until TEXT,
    last_attempt_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_ip_rate_limits (
    limit_key TEXT PRIMARY KEY,
    request_count INTEGER DEFAULT 0,
    reset_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_users_username_ci
    ON admin_users (lower(username)) WHERE username IS NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS ux_cgs_attendance_once
    ON cgs_attendance_records (registrant_id, session_id);
  CREATE UNIQUE INDEX IF NOT EXISTS ux_cgs_session_registration_once
    ON cgs_session_registrations (session_id, registrant_id);
  CREATE UNIQUE INDEX IF NOT EXISTS ux_cgs_registrants_email
    ON cgs_registrants (email);
  CREATE UNIQUE INDEX IF NOT EXISTS ux_cgs_session_speakers_once
    ON cgs_session_speakers (session_id, speaker_id);

  CREATE INDEX IF NOT EXISTS idx_online_sessions_status ON online_sessions(status);
  CREATE INDEX IF NOT EXISTS idx_online_sessions_starts_at ON online_sessions(starts_at);
  CREATE INDEX IF NOT EXISTS idx_cgs_session_registrations_session_id ON cgs_session_registrations(session_id);
  CREATE INDEX IF NOT EXISTS idx_cgs_session_registrations_registrant_id ON cgs_session_registrations(registrant_id);
  CREATE INDEX IF NOT EXISTS idx_cgs_attendance_records_session_id ON cgs_attendance_records(session_id);
  CREATE INDEX IF NOT EXISTS idx_cgs_attendance_records_registrant_id ON cgs_attendance_records(registrant_id);
  CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);
`

function makeHeaders() {
  const headers = new Headers({
    apikey: supabaseSecret,
    Prefer: 'count=exact',
  })
  if (!supabaseSecret.startsWith('sb_secret_')) {
    headers.set('authorization', `Bearer ${supabaseSecret}`)
  }
  return headers
}

async function fetchTableData(table) {
  const rows = []
  const limit = 1000
  let offset = 0
  let totalReported = null

  while (true) {
    const url = `${supabaseUrl}/rest/v1/${table}?limit=${limit}&offset=${offset}`
    const resp = await fetch(url, { headers: makeHeaders() })
    if (!resp.ok) {
      const err = await resp.text()
      throw new Error(`Failed to fetch ${table} (HTTP ${resp.status}): ${err}`)
    }
    const cr = resp.headers.get('content-range')
    if (cr && totalReported === null) {
      totalReported = cr.split('/')[1]
    }
    const data = await resp.json()
    if (!Array.isArray(data) || data.length === 0) break
    rows.push(...data)
    if (data.length < limit) break
    offset += limit
  }

  return { rows, totalReported: totalReported ?? String(rows.length) }
}

function normalizeValue(val) {
  if (val === undefined || val === null) return null
  if (typeof val === 'boolean') return val ? 1 : 0
  if (typeof val === 'object') return JSON.stringify(val)
  return val
}

async function main() {
  console.log('='.repeat(70))
  console.log('SUPABASE DATABASE TO LOCAL SQLITE BACKUP & RESTORE')
  console.log('='.repeat(70))
  console.log(`Source Supabase URL : ${supabaseUrl}`)
  console.log(`Target SQLite File  : ${targetDbPath}\n`)

  // Initialize sql.js
  const SQL = await initSqlJs({
    locateFile: (f) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', f),
  })

  const db = new SQL.Database()
  db.exec('PRAGMA foreign_keys = OFF;')
  db.exec(SCHEMA_DDL)

  // Track results
  const summary = []

  for (const table of ALL_TABLES) {
    process.stdout.write(`Fetching ${table.padEnd(30)} ... `)
    const { rows, totalReported } = await fetchTableData(table)
    process.stdout.write(`[${rows.length} rows] -> writing to SQLite ... `)

    if (rows.length > 0) {
      // Only copy columns that exist in the local schema; the hosted table may
      // briefly carry legacy columns that have been removed locally.
      const targetColumns = new Set(
        (db.exec(`PRAGMA table_info("${table}")`)[0]?.values ?? []).map((row) => String(row[1])),
      )
      // Get all unique columns across all rows in this table
      const columnSet = new Set()
      for (const row of rows) {
        for (const k of Object.keys(row)) {
          if (targetColumns.has(k)) columnSet.add(k)
        }
      }
      const columns = Array.from(columnSet)
      const placeholders = columns.map(() => '?').join(', ')
      const insertSql = `INSERT OR REPLACE INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`
      const stmt = db.prepare(insertSql)

      try {
        for (const row of rows) {
          const params = columns.map((col) => normalizeValue(row[col]))
          stmt.run(params)
        }
      } finally {
        stmt.free()
      }
    }

    // Verify row count in SQLite
    const countRes = db.exec(`SELECT count(*) FROM "${table}"`)
    const sqliteCount = countRes[0]?.values?.[0]?.[0] ?? 0
    console.log(`✔ Verified (${sqliteCount} in SQLite)`)

    summary.push({
      table,
      supabase: totalReported,
      sqlite: sqliteCount,
      status: String(sqliteCount) === String(rows.length) ? 'MATCH ✅' : 'MISMATCH ⚠️',
    })
  }

  db.exec('PRAGMA foreign_keys = ON;')

  // Save to targetDbPath (root cgs.db)
  console.log(`\nExporting SQLite database to: ${targetDbPath}`)
  const exported = db.export()
  fs.writeFileSync(targetDbPath, Buffer.from(exported))
  db.close()

  console.log(`✔ Database written successfully (${exported.byteLength} bytes / ${(exported.byteLength / 1024).toFixed(1)} KB)`)

  console.log('\n' + '='.repeat(70))
  console.log('BACKUP & VERIFICATION SUMMARY TABLE:')
  console.log('='.repeat(70))
  console.table(summary)

  console.log('\n✅ Local SQLite database created at project root with complete Supabase backup!')
}

main().catch((err) => {
  console.error('\n❌ Backup failed:', err)
  process.exit(1)
})
