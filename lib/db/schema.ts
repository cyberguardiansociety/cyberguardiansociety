import { getDatabase, saveDatabase } from './client'
import { getSupabaseRuntimeConfig } from '../supabase/config'

/**
 * Canonical SQLite schema for Cyber Guardian Society.
 *
 * Table names match the names used across the application code
 * (the former PostgREST table names), so the SQLite-backed query layer
 * in `lib/db/sqlite-adapter.ts` needs no name mapping.
 *
 * `applySchema` is IDEMPOTENT: it can run on every process start and on
 * already-initialized databases. It creates missing tables, adds missing
 * columns to legacy tables, creates missing unique indexes, drops legacy
 * empty tables, and seeds portal settings.
 */
export function applySchema(db: any): void {
  db.exec(`
    -- Admin users table (SQLite-native: email + password_hash live here)
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

    -- Online sessions table
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

    -- Speakers table
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

    -- Session speakers junction table
    CREATE TABLE IF NOT EXISTS cgs_session_speakers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      speaker_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES online_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (speaker_id) REFERENCES cgs_speakers(id) ON DELETE CASCADE
    );

    -- Registrants table
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

    -- Session registrations junction table
    CREATE TABLE IF NOT EXISTS cgs_session_registrations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      registrant_id TEXT NOT NULL,
      source TEXT,
      registered_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES online_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (registrant_id) REFERENCES cgs_registrants(id) ON DELETE CASCADE
    );

    -- Attendance records table
    CREATE TABLE IF NOT EXISTS cgs_attendance_records (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      registrant_id TEXT NOT NULL,
      marked_at TEXT DEFAULT (datetime('now')),
      method TEXT DEFAULT 'manual',
      override_reason TEXT,
      FOREIGN KEY (session_id) REFERENCES online_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (registrant_id) REFERENCES cgs_registrants(id) ON DELETE CASCADE
    );

    -- Managed content table (announcements, products, merchandise, resources)
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
      price REAL,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'published',
      sort_order INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Inbox messages table (contact + join + speaker applications)
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

    -- Portal settings table
    CREATE TABLE IF NOT EXISTS cgs_portal_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Payment ledger table
    CREATE TABLE IF NOT EXISTS cgs_payment_ledger (
      id TEXT PRIMARY KEY,
      entry_type TEXT,
      status TEXT DEFAULT 'pending',
      amount REAL,
      currency TEXT DEFAULT 'USD',
      payer TEXT,
      payee TEXT,
      reference TEXT,
      payment_method TEXT,
      commission REAL,
      occurred_at TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Google Sheets sync connections table
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

    -- Google Sheets sync run log table
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

    -- Applications table
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT DEFAULT 'received',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Audit log table
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // ── Column-level migrations for databases created by older schema versions ──
  const tableColumns = (table: string): Set<string> => {
    const result = db.exec(`PRAGMA table_info(${table})`)
    const names = new Set<string>()
    if (result[0]) {
      for (const row of result[0].values) names.add(String(row[1]))
    }
    return names
  }

  const ensureColumn = (table: string, column: string, ddl: string) => {
    if (!tableColumns(table).has(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
    }
  }

  ensureColumn('admin_users', 'username', 'username TEXT')
  ensureColumn('admin_users', 'is_protected', 'is_protected INTEGER NOT NULL DEFAULT 0')
  ensureColumn('online_sessions', 'created_by', 'created_by TEXT')
  ensureColumn('cgs_session_registrations', 'source', 'source TEXT')
  ensureColumn('cgs_inbox_messages', 'kind', "kind TEXT DEFAULT 'contact'")
  ensureColumn('cgs_inbox_messages', 'metadata', 'metadata TEXT')
  ensureColumn('cgs_inbox_messages', 'source', 'source TEXT')
  ensureColumn('cgs_google_sync_runs', 'started_at', 'started_at TEXT')

  // ── Unique indexes (required for the '23505' duplicate-detection contract) ──
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_users_username_ci
      ON admin_users (lower(username)) WHERE username IS NOT NULL;

    CREATE TRIGGER IF NOT EXISTS protect_admin_users_update
      BEFORE UPDATE ON admin_users
      WHEN OLD.is_protected = 1
      BEGIN
        SELECT RAISE(ABORT, 'Protected administrator credentials cannot be changed');
      END;

    CREATE TRIGGER IF NOT EXISTS protect_admin_users_delete
      BEFORE DELETE ON admin_users
      WHEN OLD.is_protected = 1
      BEGIN
        SELECT RAISE(ABORT, 'Protected administrator cannot be deleted');
      END;

    CREATE UNIQUE INDEX IF NOT EXISTS ux_cgs_attendance_once
      ON cgs_attendance_records (registrant_id, session_id);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_cgs_session_registration_once
      ON cgs_session_registrations (session_id, registrant_id);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_cgs_registrants_email
      ON cgs_registrants (email);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_cgs_session_speakers_once
      ON cgs_session_speakers (session_id, speaker_id);

    CREATE INDEX IF NOT EXISTS idx_online_sessions_status ON online_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_online_sessions_management_status ON online_sessions(management_status);
    CREATE INDEX IF NOT EXISTS idx_online_sessions_starts_at ON online_sessions(starts_at);
    CREATE INDEX IF NOT EXISTS idx_cgs_session_registrations_session_id ON cgs_session_registrations(session_id);
    CREATE INDEX IF NOT EXISTS idx_cgs_session_registrations_registrant_id ON cgs_session_registrations(registrant_id);
    CREATE INDEX IF NOT EXISTS idx_cgs_attendance_records_session_id ON cgs_attendance_records(session_id);
    CREATE INDEX IF NOT EXISTS idx_cgs_attendance_records_registrant_id ON cgs_attendance_records(registrant_id);
    CREATE INDEX IF NOT EXISTS idx_cgs_managed_content_type ON cgs_managed_content(content_type);
    CREATE INDEX IF NOT EXISTS idx_cgs_managed_content_status ON cgs_managed_content(status);
    CREATE INDEX IF NOT EXISTS idx_cgs_inbox_messages_status ON cgs_inbox_messages(status);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_cgs_google_sync_runs_connection ON cgs_google_sync_runs(connection_id);
  `)

  // ── Legacy table cleanup ──
  // Early SQLite experiments created `inbox_messages` and `managed_content`
  // under non-canonical names. Drop them only when they are empty so no data
  // is ever destroyed.
  for (const legacy of ['inbox_messages', 'managed_content']) {
    try {
      const exists = db.exec(
        `SELECT name FROM sqlite_master WHERE type='table' AND name = '${legacy}'`
      )
      if (!exists[0] || exists[0].values.length === 0) continue
      const countResult = db.exec(`SELECT COUNT(*) AS c FROM ${legacy}`)
      const count = countResult[0]?.values?.[0]?.[0] ?? 0
      if (count === 0) {
        db.exec(`DROP TABLE IF EXISTS ${legacy}`)
      }
    } catch {
      // Never let legacy cleanup block startup.
    }
  }

  // ── Portal settings seed ──
  try {
    const now = new Date().toISOString()
    const portalSettings = [
      ['portal_open', 'true'],
      ['attendance_open', 'true'],
      ['join_cgs_coming_soon', 'false'],
      ['speaker_coming_soon', 'false'],
      ['maintenance_mode', 'false'],
      ['maintenance_message', 'Our website is temporarily unavailable while we complete scheduled maintenance. Please check back soon.'],
    ] as const
    const statement = db.prepare(
      `INSERT OR IGNORE INTO cgs_portal_settings (id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    )
    try {
      for (const [key, value] of portalSettings) {
        statement.run([`seed-${key}`, key, value, now, now])
      }
    } finally {
      statement.free()
    }
  } catch {
    // Never let seeding block startup.
  }
}

export async function initializeDatabase(): Promise<void> {
  // Vercel instances are ephemeral. In hosted mode all persistent state must
  // come from Supabase; never initialize or write a local SQLite copy there.
  if (getSupabaseRuntimeConfig()) return
  const db = await getDatabase()
  applySchema(db)
  await saveDatabase()
}
