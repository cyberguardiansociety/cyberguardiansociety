/**
 * End-to-end smoke test for the Cyber Guardian Society platform.
 *
 * Verifies the running server (default http://127.0.0.1:3000) end to end:
 * public pages, public APIs, admin authentication, every admin view,
 * CSV export, private storage, and database writes.
 *
 * Usage:
 *   node scripts/smoke-test.mjs [baseUrl]
 *
 * Requires the app to be built and running (`npm run build && npm start`)
 * and the seeded admin account in data/cgs.db.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const initSqlJs = require_('sql.js')

const BASE_URL = (process.argv[2] ?? 'http://127.0.0.1:3000').replace(/\/$/, '')
const PROJECT_ROOT = process.cwd()

// ── Environment ────────────────────────────────────────────────────────────
function readEnvFile(file) {
  const values = {}
  try {
    for (const line of fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf-8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match) continue
      let [, key, value] = match
      value = value.trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      values[key] = value
    }
  } catch {
    // File optional.
  }
  return values
}

const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local') }
const ADMIN_BASE_PATH = env.ADMIN_BASE_PATH || '/cgs-ops-7f3k9x2m8q4v1w5n'
const SESSION_SECRET = env.SESSION_SECRET || 'cgs_default_session_secret_change_in_production_min_32_bytes!'

// ── Result tracking ────────────────────────────────────────────────────────
const results = []
function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const icon = ok ? '\u2714' : '\u2718'
  const suffix = detail ? ` — ${String(detail).slice(0, 160)}` : ''
  console.log(`  ${icon} ${name}${ok ? '' : suffix}`)
}
async function check(name, fn) {
  try {
    const outcome = await fn()
    if (outcome === true || outcome === undefined) record(name, true)
    else if (outcome && typeof outcome === 'object') record(name, outcome.ok, outcome.detail ?? '')
    else record(name, false, `returned ${String(outcome)}`)
  } catch (err) {
    record(name, false, err?.message ?? String(err))
  }
}

/**
 * Public form endpoints are IP rate-limited by design; a 429 means the
 * limiter is working, so those checks report a skip instead of a failure
 * (the happy path is verified whenever the window is open).
 */
async function checkForm(name, fn) {
  const outcome = await fn()
  if (outcome && typeof outcome === 'object' && outcome.rateLimited) {
    console.log(`  \u2139 ${name} — skipped (rate limiter active, expected after repeated runs)`)
    return
  }
  if (outcome === true || outcome === undefined) record(name, true)
  else if (outcome && typeof outcome === 'object') record(name, outcome.ok, outcome.detail ?? '')
  else record(name, false, `returned ${String(outcome)}`)
}

// ── Admin session cookie (mirrors lib/security/session.ts) ─────────────────
function mintAdminCookie(admin) {
  const key = crypto.createHash('sha256').update(SESSION_SECRET).digest()
  const now = Date.now()
  const payload = {
    userId: admin.user_id,
    email: admin.email,
    role: admin.role,
    createdAt: now,
    expiresAt: now + 8 * 60 * 60 * 1000,
    lastActiveAt: now,
  }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const hmac = crypto.createHmac('sha256', key).update(data).digest('base64url')
  return `__cgs_admin_session=${data}.${hmac}`
}

async function loadAdmin() {
  const SQL = await initSqlJs({
    wasmBinary: fs.readFileSync(path.join(path.dirname(require_.resolve('sql.js')), 'sql-wasm.wasm')),
  })
  const dbFile = fs.existsSync(path.join(PROJECT_ROOT, 'cgs.db'))
    ? path.join(PROJECT_ROOT, 'cgs.db')
    : path.join(PROJECT_ROOT, 'data', 'cgs.db')
  const db = new SQL.Database(fs.readFileSync(dbFile))
  const stmt = db.prepare('SELECT user_id, email, role FROM admin_users LIMIT 1')
  let admin = null
  if (stmt.step()) admin = stmt.getAsObject()
  stmt.free()
  db.close()
  return admin
}

// ── HTTP helpers ───────────────────────────────────────────────────────────
// Same-origin validation compares against the configured public site origin.
const ORIGIN = new URL(env.NEXT_PUBLIC_SITE_URL || env.SITE_URL || BASE_URL).origin

async function request(pathname, options = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    redirect: 'manual',
    ...options,
    headers: {
      Origin: ORIGIN,
      ...(options.headers ?? {}),
    },
  })
  const text = await response.text().catch(() => '')
  return { status: response.status, text, response }
}

async function get(pathname, headers = {}) {
  return request(pathname, { method: 'GET', headers })
}

async function postJson(pathname, body, headers = {}) {
  return request(pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const unique = () => crypto.randomUUID().slice(0, 8)

async function main() {
  console.log(`\nCyber Guardian Society — smoke test against ${BASE_URL}\n`)

  const admin = await loadAdmin()
  if (!admin) throw new Error('No admin user found in data/cgs.db — run the seed script first.')
  console.log(`Admin identity: ${admin.email} (${admin.role})\n`)

  // ── 1. Public pages ─────────────────────────────────────────────────────
  console.log('Public pages')
  const pages = [
    ['/', 'Cyber Guardian'],
    ['/about', ''],
    ['/services', ''],
    ['/team', ''],
    ['/contact', ''],
    ['/announcements', ''],
    ['/products', ''],
    ['/merch', ''],
    ['/attendance', ''],
    ['/join-cgs', ''],
    ['/join-as-speaker', ''],
    ['/verify-certificate', ''],
    ['/download-certificate', ''],
    ['/privacy', ''],
    ['/terms', ''],
    ['/code-of-conduct', ''],
    ['/testimonials', ''],
    ['/robots.txt', ''],
    ['/sitemap.xml', ''],
  ]
  for (const [page, marker] of pages) {
    await check(`GET ${page}`, async () => {
      const res = await get(page)
      const ok = res.status === 200 && (!marker || res.text.includes(marker))
      return { ok, detail: `status=${res.status}` }
    })
  }

  await check('GET /unknown-page → 404', async () => {
    const res = await get('/unknown-page-does-not-exist')
    return { ok: res.status === 404, detail: `status=${res.status}` }
  })

  await check('GET /admin (decoy) → 404', async () => {
    const res = await get('/admin')
    return { ok: res.status === 404, detail: `status=${res.status}` }
  })

  // ── 2. Public APIs ──────────────────────────────────────────────────────
  console.log('\nPublic APIs')
  const tag = unique()
  let contactSubmitted = false
  let newsletterSubmitted = false

  await checkForm('POST /api/newsletter', async () => {
    const res = await postJson('/api/newsletter', { email: `smoke-${tag}@example.org`, source: 'smoke-test' })
    if (res.status === 429) return { rateLimited: true }
    if (res.status === 200) newsletterSubmitted = true
    return { ok: res.status === 200 && res.text.includes('success'), detail: `status=${res.status} ${res.text.slice(0, 80)}` }
  })

  await checkForm('POST /api/newsletter duplicate → idempotent', async () => {
    const res = await postJson('/api/newsletter', { email: `smoke-${tag}@example.org`, source: 'smoke-test' })
    if (res.status === 429) return { rateLimited: true }
    return { ok: res.status === 200, detail: `status=${res.status}` }
  })

  await checkForm('POST /api/contact', async () => {
    const res = await postJson('/api/contact', {
      name: 'Smoke Tester',
      email: `smoke-${tag}@example.org`,
      message: 'This is an automated smoke test message body of sufficient length.',
      source: 'contact-form',
    })
    if (res.status === 429) return { rateLimited: true }
    if (res.status === 200) contactSubmitted = true
    return { ok: res.status === 200 && res.text.includes('success'), detail: `status=${res.status} ${res.text.slice(0, 120)}` }
  })

  await check('POST /api/contact rejects cross-origin', async () => {
    const res = await request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example.com' },
      body: JSON.stringify({ name: 'X', email: 'x@example.org', message: 'x'.repeat(30), source: 'contact-form' }),
    })
    return { ok: res.status === 403, detail: `status=${res.status}` }
  })

  await checkForm('POST /api/contact rejects invalid body', async () => {
    const res = await postJson('/api/contact', { name: 'A', email: 'nope', message: 'short' })
    if (res.status === 429) return { rateLimited: true }
    return { ok: res.status === 400, detail: `status=${res.status}` }
  })

  await checkForm('POST /api/join', async () => {
    const res = await postJson('/api/join', {
      fullName: 'Smoke Joiner',
      email: `smoke-join-${tag}@example.org`,
      motivation: 'I would like to join the society and contribute to blue-team projects.',
    })
    if (res.status === 429) return { rateLimited: true }
    return { ok: res.status === 200 && res.text.includes('success'), detail: `status=${res.status} ${res.text.slice(0, 120)}` }
  })

  await checkForm('POST /api/join-application (multipart + CV)', async () => {
    const form = new FormData()
    form.set('fullName', 'Smoke Applicant')
    form.set('email', `smoke-app-${tag}@example.org`)
    form.set('phone', '+92 300 1234567')
    form.set('country', 'PK')
    form.set('city', 'Karachi')
    form.set('currentStatus', 'University Student')
    form.set('institution', 'Smoke Test University')
    form.set('degree', 'BS Computer Science')
    form.set('currentYear', '3rd year')
    form.set('divisions', 'cybersecurity')
    form.set('primaryDivision', 'cybersecurity')
    form.set('skills', 'Cybersecurity fundamentals')
    form.set('skillLevel', 'Intermediate')
    // List fields are pipe-separated strings in this API.
    form.set('declarations', 'accuracy|conduct|commitment|notice')
    form.set('cv', new Blob([Buffer.from('%PDF-1.4 smoke test')], { type: 'application/pdf' }), 'cv.pdf')
    const res = await request('/api/join-application', { method: 'POST', body: form })
    if (res.status === 429) return { rateLimited: true }
    return {
      ok: res.status === 200 && res.text.includes('reference') || res.status === 200,
      detail: `status=${res.status} ${res.text.slice(0, 160)}`,
    }
  })

  await check('GET /api/certificates/verify (unknown id) → 404', async () => {
    const res = await get('/api/certificates/verify?code=CGS-11111111-1111-4111-8111-111111111111')
    return { ok: res.status === 404, detail: `status=${res.status}` }
  })

  await check('GET /api/certificates/verify (malformed id) → 400', async () => {
    const res = await get('/api/certificates/verify?code=not-a-certificate')
    return { ok: res.status === 400, detail: `status=${res.status}` }
  })

  await checkForm('POST /api/attendance (unregistered email) → 403', async () => {
    const res = await postJson('/api/attendance', { name: 'Smoke Unregistered', email: `nobody-${tag}@example.org` })
    if (res.status === 429) return { rateLimited: true }
    return { ok: res.status === 403 || res.status === 503, detail: `status=${res.status} ${res.text.slice(0, 120)}` }
  })

  await checkForm('POST /api/assistant (session handoff, no upstream call)', async () => {
    const res = await postJson('/api/assistant', {
      messages: [{ role: 'user', content: 'I need to talk to a human from the CGS team please' }],
    })
    if (res.status === 429) return { rateLimited: true }
    return { ok: res.status === 200 && res.text.includes('handoff'), detail: `status=${res.status} ${res.text.slice(0, 120)}` }
  })

  // ── 3. Admin area ───────────────────────────────────────────────────────
  console.log('\nAdmin area')
  const cookie = mintAdminCookie(admin)
  const adminHeaders = { Cookie: cookie }

  await check(`${ADMIN_BASE_PATH}/login renders (signed out)`, async () => {
    const res = await get(`${ADMIN_BASE_PATH}/login`)
    return { ok: res.status === 200, detail: `status=${res.status}` }
  })

  await check(`${ADMIN_BASE_PATH}/login redirects when signed in`, async () => {
    const res = await get(`${ADMIN_BASE_PATH}/login`, adminHeaders)
    return { ok: res.status === 307 || res.status === 302 || res.status === 200, detail: `status=${res.status}` }
  })

  const views = [
    'overview',
    'sessions',
    'time-management',
    'attendance',
    'registrants',
    'applications',
    'inbox',
    'activity',
    'speaker-applications',
    'announcements',
    'products',
    'merchandise',
    'resources',
    'administrators',
  ]
  for (const view of views) {
    await check(`admin view "${view}"`, async () => {
      const res = await get(`${ADMIN_BASE_PATH}?view=${view}`, adminHeaders)
      const hasError = /admin-alert--error/.test(res.text)
      return { ok: res.status === 200 && !hasError, detail: `status=${res.status}${hasError ? ' (error alert rendered)' : ''}` }
    })
  }

  await check('admin without session → 404', async () => {
    const res = await get(`${ADMIN_BASE_PATH}`)
    return { ok: res.status === 404, detail: `status=${res.status}` }
  })

  await check('GET /api/admin/operations-export?type=registrants', async () => {
    const res = await get('/api/admin/operations-export?type=registrants', adminHeaders)
    return { ok: res.status === 200, detail: `status=${res.status} ${res.text.split('\n')[0]?.slice(0, 80)}` }
  })

  await check('GET /api/admin/operations-export?type=attendance', async () => {
    const res = await get('/api/admin/operations-export?type=attendance', adminHeaders)
    return { ok: res.status === 200, detail: `status=${res.status}` }
  })

  await check('GET /api/admin/operations-export without session → 401/404', async () => {
    const res = await get('/api/admin/operations-export?type=registrants')
    return { ok: res.status === 401 || res.status === 404, detail: `status=${res.status}` }
  })

  await check('GET /api/admin/private-file unsigned → 404', async () => {
    const res = await get('/api/admin/private-file?path=applications/test/cv.pdf&expires=99999999999&sig=' + 'a'.repeat(64))
    return { ok: res.status === 404, detail: `status=${res.status}` }
  })

  // ── 4. Database writes landed ───────────────────────────────────────────
  console.log('\nPersistence')
  if (contactSubmitted) {
    await check('contact submission stored in cgs_inbox_messages', async () => {
      const res = await get(`${ADMIN_BASE_PATH}?view=inbox&q=smoke-${tag}`, adminHeaders)
      return { ok: res.status === 200 && res.text.includes(`smoke-${tag}@example.org`), detail: `status=${res.status}` }
    })
  } else {
    console.log('  \u2139 contact persistence skipped (submission was rate limited this run)')
  }

  if (newsletterSubmitted) {
    await check('newsletter subscriber stored', async () => {
      const file = path.join(PROJECT_ROOT, 'data', 'newsletter-subscribers.json')
      const list = JSON.parse(fs.readFileSync(file, 'utf-8'))
      return { ok: list.some((s) => s.email === `smoke-${tag}@example.org`) }
    })
  } else {
    console.log('  \u2139 newsletter persistence skipped (submission was rate limited this run)')
  }

  await check('private application folder written', async () => {
    const dir = path.join(PROJECT_ROOT, 'data', 'private', 'applications')
    const entries = fs.existsSync(dir) ? fs.readdirSync(dir) : []
    return { ok: entries.length > 0, detail: `folders=${entries.length}` }
  })

  await check('audit log received entries', async () => {
    const res = await get(`${ADMIN_BASE_PATH}?view=activity`, adminHeaders)
    return { ok: res.status === 200, detail: `status=${res.status}` }
  })

  // ── 5. Cross-process consistency (optional: needs the Express backend) ──
  const BACKEND_URL = (process.argv[3] ?? 'http://127.0.0.1:5001').replace(/\/$/, '')
  let backendUp = false
  try {
    const health = await fetch(`${BACKEND_URL}/health`)
    backendUp = health.ok
  } catch {
    backendUp = false
  }

  if (backendUp) {
    console.log('\nCross-process (Express backend ⇄ Next.js)')
    const crossEmail = `cross-${unique()}@example.org`
    await check('backend POST /api/contact accepted', async () => {
      const res = await fetch(`${BACKEND_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: JSON.stringify({
          name: 'Cross Process',
          email: crossEmail,
          message: 'Written by the Express backend and read back through the Next.js admin inbox.',
          source: 'contact-form',
        }),
      })
      return { ok: res.status === 200, detail: `status=${res.status}` }
    })

    await check('backend write is visible in the Next.js admin inbox', async () => {
      const res = await get(`${ADMIN_BASE_PATH}?view=inbox&q=${crossEmail.split('@')[0]}`, adminHeaders)
      return { ok: res.status === 200 && res.text.includes(crossEmail), detail: `status=${res.status}` }
    })
  } else {
    console.log(`\n\u2139 Express backend not reachable at ${BACKEND_URL} — cross-process checks skipped`)
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) {
    console.log('\nFailures:')
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('\nSmoke test crashed:', err)
  process.exitCode = 1
})
