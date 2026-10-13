/**
 * Verifies the admin write path (Next.js server actions) end to end:
 * creates a session through the real admin form, confirms it is persisted
 * (SQLite + audit log) and visible in the admin UI, then deletes it.
 *
 * Usage: node scripts/test-admin-actions.mjs [baseUrl]
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const initSqlJs = require_('sql.js')
const root = process.cwd()
const BASE = (process.argv[2] ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

function readEnv(file) {
  const out = {}
  try {
    for (const line of fs.readFileSync(path.join(root, file), 'utf-8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      out[m[1]] = v
    }
  } catch {}
  return out
}
const env = { ...readEnv('.env'), ...readEnv('.env.local') }
const base = env.ADMIN_BASE_PATH || '/cgs-ops-7f3k9x2m8q4v1w5n'

let passed = 0
let failed = 0
function check(name, ok, detail = '') {
  if (ok) {
    passed++
    console.log(`  \u2714 ${name}`)
  } else {
    failed++
    console.log(`  \u2718 ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

async function openDb() {
  const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(path.join(path.dirname(require_.resolve('sql.js')), 'sql-wasm.wasm')) })
  return new SQL.Database(fs.readFileSync(path.join(root, 'data', 'cgs.db')))
}

const db = await openDb()
const stmt = db.prepare('SELECT user_id, email, role FROM admin_users LIMIT 1')
stmt.step()
const admin = stmt.getAsObject()
stmt.free()
db.close()

const key = crypto.createHash('sha256').update(env.SESSION_SECRET).digest()
const now = Date.now()
const payload = { userId: admin.user_id, email: admin.email, role: admin.role, createdAt: now, expiresAt: now + 3600000, lastActiveAt: now }
const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
const hmac = crypto.createHmac('sha256', key).update(data).digest('base64url')
const cookie = `__cgs_admin_session=${data}.${hmac}`

const title = `Smoke Test Session ${crypto.randomUUID().slice(0, 8)}`

function parseForms(html) {
  return (html.match(/<form[\s\S]*?<\/form>/g) || []).map((form) => {
    const fields = [...form.matchAll(/<input[^>]*>/g)].map((m) => m[0])
    const names = fields
      .map((tag) => (tag.match(/name="([^"]+)"/) || [])[1])
      .filter(Boolean)
    const values = {}
    for (const tag of fields) {
      const name = (tag.match(/name="([^"]+)"/) || [])[1]
      const value = (tag.match(/value="([^"]*)"/) || [])[1] ?? ''
      if (name) values[name] = value
    }
    const actionId = names.find((n) => n.startsWith('$ACTION_ID_'))
    const selects = [...form.matchAll(/<select[^>]*name="([^"]+)"[\s\S]*?<\/select>/g)].map((m) => m[1])
    const textareas = [...form.matchAll(/<textarea[^>]*name="([^"]+)"/g)].map((m) => m[1])
    return { form, names, values, actionId, selects, textareas }
  })
}

async function getView(view) {
  const res = await fetch(`${BASE}${base}?view=${view}`, { headers: { Cookie: cookie }, redirect: 'manual' })
  return { status: res.status, html: await res.text(), location: res.headers.get('location') }
}

async function postAction(actionId, fields) {
  const form = new FormData()
  form.set(actionId, '')
  for (const [k, v] of Object.entries(fields)) form.set(k, v)
  const res = await fetch(`${BASE}${base}`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: form,
    redirect: 'manual',
  })
  return {
    status: res.status,
    location: res.headers.get('location') ?? '',
    text: await res.text().catch(() => ''),
  }
}

console.log('\nAdmin server-action write test\n')

// ── 0. Real sign-in through the login form ────────────────────────────────
const loginPage = await fetch(`${BASE}${base}/login`, { redirect: 'manual' })
const loginHtml = await loginPage.text()
const loginForm = parseForms(loginHtml).find((f) => f.names.includes('email') && f.names.includes('password'))
check('login form found', Boolean(loginForm?.actionId), `status=${loginPage.status}`)

if (loginForm?.actionId) {
  const good = new FormData()
  good.set(loginForm.actionId, '')
  good.set('email', admin.email)
  // Overridable for environments where the seeded password differs.
  good.set('password', process.env.CGS_TEST_ADMIN_PASSWORD ?? 'admin123')
  const goodRes = await fetch(`${BASE}${base}/login`, {
    method: 'POST',
    body: good,
    redirect: 'manual',
  })
  const setCookie = goodRes.headers.get('set-cookie') ?? ''
  check(
    'sign-in with valid credentials issues a session cookie',
    /__cgs_admin_session=/.test(setCookie) && goodRes.status < 400,
    `status=${goodRes.status}`,
  )

  const bad = new FormData()
  bad.set(loginForm.actionId, '')
  bad.set('email', admin.email)
  bad.set('password', 'definitely-not-the-password')
  const badRes = await fetch(`${BASE}${base}/login`, {
    method: 'POST',
    body: bad,
    redirect: 'manual',
  })
  const badCookie = badRes.headers.get('set-cookie') ?? ''
  const badLocation = badRes.headers.get('location') ?? ''
  check(
    'sign-in with a wrong password is rejected',
    !/__cgs_admin_session=[^;]+\./.test(badCookie) && /error=credentials|error=locked/.test(badLocation + badRes.status),
    `status=${badRes.status} location=${badLocation}`,
  )
}

// ── 1. Create a session through the real form ──────────────────────────────
const sessionsView = await getView('sessions')
check('sessions view renders', sessionsView.status === 200, `status=${sessionsView.status}`)

const forms = parseForms(sessionsView.html)
const createForm = forms.find((f) => f.names.includes('title') && f.names.includes('startsAt'))
check('create-session form found', Boolean(createForm?.actionId))

let createdId = null
if (createForm?.actionId) {
  const result = await postAction(createForm.actionId, {
    title,
    description: 'Session created by the automated admin write-path test.',
    startsAt: '2026-12-01T10:00',
    endsAt: '2026-12-01T11:00',
    timezone: 'Asia/Karachi',
    managementStatus: 'UPCOMING',
    isPublished: 'on',
    isActive: 'on',
    registrationOpen: 'on',
  })
  check(
    'create action completes with a redirect',
    result.status === 303 || result.status === 307 || result.status === 302,
    `status=${result.status}`,
  )

  const after = await openDb()
  const rows = after.exec(`SELECT id, title FROM online_sessions WHERE title = '${title.replace(/'/g, "''")}'`)
  createdId = rows[0]?.values?.[0]?.[0] ?? null
  const audit = after.exec(
    `SELECT COUNT(*) FROM admin_audit_log WHERE entity = 'online_sessions' AND action = 'create'`,
  )
  after.close()

  check('session persisted to online_sessions', Boolean(createdId), `title=${title}`)
  check('audit entry written for session create', (audit[0]?.values?.[0]?.[0] ?? 0) > 0)

  const list = await getView('sessions')
  check('created session visible in admin UI', list.html.includes(title))
}

// ── 2. Attendance override + registrant flow ──────────────────────────────
// The override form lives in a client component that renders only after the
// operator selects a session, so it is not part of the server HTML. The
// underlying write path (registrant + registration + attendance insert and
// duplicate detection) is covered by scripts/test-adapter.ts.
if (createdId) {
  const attendanceView = await getView('attendance')
  const overrideForm = parseForms(attendanceView.html).find(
    (f) => f.names.includes('email') && f.names.includes('reason'),
  )
  if (overrideForm?.actionId) {
    const email = `override-${crypto.randomUUID().slice(0, 6)}@example.org`
    const result = await postAction(overrideForm.actionId, {
      id: '',
      sessionId: createdId,
      email,
      reason: 'Automated attendance override verification run.',
    })
    check('attendance override action completes', result.status < 500, `status=${result.status}`)

    const after = await openDb()
    const regs = after.exec(`SELECT COUNT(*) FROM cgs_registrants WHERE email = '${email.replace(/'/g, "''")}'`)
    const att = after.exec(`SELECT COUNT(*) FROM cgs_attendance_records WHERE session_id = '${createdId}'`)
    after.close()
    check('override created registrant record', (regs[0]?.values?.[0]?.[0] ?? 0) === 1)
    check('override created attendance record', (att[0]?.values?.[0]?.[0] ?? 0) === 1)
  } else {
    console.log('  \u2139 attendance override form is client-rendered — covered by scripts/test-adapter.ts')
  }
}

// ── 3. Delete the created session through the admin form ──────────────────
if (createdId) {
  const list = await getView('sessions')
  const deleteForm = parseForms(list.html).find(
    (f) => !f.names.includes('title') && Object.values(f.values).includes(createdId) && f.actionId,
  )
  check('delete-session form found', Boolean(deleteForm?.actionId))

  if (deleteForm?.actionId) {
    const fields = {}
    for (const [k, v] of Object.entries(deleteForm.values)) {
      if (k.startsWith('$ACTION_ID_')) continue
      fields[k] = v
    }
    const result = await postAction(deleteForm.actionId, fields)
    check('delete action completes', result.status < 500, `status=${result.status}`)

    const after = await openDb()
    const rows = after.exec(`SELECT COUNT(*) FROM online_sessions WHERE id = '${createdId}'`)
    after.close()
    check('session removed from database', rows[0]?.values?.[0]?.[0] === 0)
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exitCode = failed > 0 ? 1 : 0
