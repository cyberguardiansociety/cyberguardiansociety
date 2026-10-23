/**
 * Removes data created by the automated verification suites
 * (scripts/smoke-test.mjs and scripts/test-admin-actions.mjs).
 *
 * Only rows matching the test patterns are removed:
 *   - inbox messages from smoke-/cross-/backend-writer/nobody- test addresses
 *   - newsletter subscribers with those addresses
 *   - private application folders created by the smoke test
 *   - orphaned online_sessions audit entries (the test session is deleted)
 *
 * Usage: node scripts/clean-test-data.mjs
 */
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const initSqlJs = require_('sql.js')
const root = process.cwd()

const TEST_EMAIL_PATTERNS = [
  "email LIKE 'smoke-%@example.org'",
  "email LIKE 'cross-%@example.org'",
  "email LIKE 'override-%@example.org'",
  "email LIKE 'nobody-%@example.org'",
  "email = 'backend-writer@example.org'",
  "email = 'test@example.org'",
]

const SQL_REMOVALS = [
  ['cgs_inbox_messages', `DELETE FROM cgs_inbox_messages WHERE ${TEST_EMAIL_PATTERNS.join(' OR ')}`],
  ['cgs_registrants', `DELETE FROM cgs_registrants WHERE ${TEST_EMAIL_PATTERNS.join(' OR ')}`],
  [
    'admin_audit_log',
    `DELETE FROM admin_audit_log
      WHERE entity = 'online_sessions'
        AND entity_id IS NOT NULL
        AND entity_id NOT IN (SELECT id FROM online_sessions)`,
  ],
]

async function main() {
  const dbPath = fs.existsSync(path.join(root, 'cgs.db'))
    ? path.join(root, 'cgs.db')
    : path.join(root, 'data', 'cgs.db')
  const SQL = await initSqlJs({
    wasmBinary: fs.readFileSync(path.join(path.dirname(require_.resolve('sql.js')), 'sql-wasm.wasm')),
  })
  const db = new SQL.Database(fs.readFileSync(dbPath))

  console.log('Cleaning verification data\n')
  for (const [label, sql] of SQL_REMOVALS) {
    db.exec(sql)
    const changes = db.getRowsModified()
    console.log(`  ${label}: ${changes} row(s) removed`)
  }

  fs.writeFileSync(dbPath, Buffer.from(db.export()))
  db.close()

  // Newsletter subscribers (JSON store)
  const newsletterFile = path.join(root, 'data', 'newsletter-subscribers.json')
  if (fs.existsSync(newsletterFile)) {
    const list = JSON.parse(fs.readFileSync(newsletterFile, 'utf-8'))
    const kept = list.filter(
      (entry) =>
        !/^(smoke|cross|override|nobody)-/.test(entry.email) &&
        entry.email !== 'backend-writer@example.org' &&
        entry.source !== 'smoke-test',
    )
    fs.writeFileSync(newsletterFile, JSON.stringify(kept, null, 2), 'utf-8')
    console.log(`  newsletter-subscribers.json: ${list.length - kept.length} entr(y/ies) removed`)
  }

  // Private application folders created by the smoke test
  const applicationsDir = path.join(root, 'data', 'private', 'applications')
  if (fs.existsSync(applicationsDir)) {
    let removed = 0
    for (const entry of fs.readdirSync(applicationsDir)) {
      const full = path.join(applicationsDir, entry)
      const metadata = path.join(full, 'application.json')
      if (!fs.existsSync(metadata)) continue
      try {
        const record = JSON.parse(fs.readFileSync(metadata, 'utf-8'))
        const email = String(record?.personal?.email ?? '')
        if (/^(smoke|cross|override)-/.test(email) || email === 'smoke-app@example.org') {
          fs.rmSync(full, { recursive: true, force: true })
          removed++
        }
      } catch {
        // Leave unreadable folders untouched.
      }
    }
    console.log(`  data/private/applications: ${removed} folder(s) removed`)
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Cleanup failed:', err)
  process.exitCode = 1
})
