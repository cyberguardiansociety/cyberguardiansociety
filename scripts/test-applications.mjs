/**
 * Verifies the membership-application review path end to end:
 * submit an application (multipart + CV) -> it appears in the admin
 * applications view -> the CV link is signed and serves the PDF.
 *
 * Usage: node scripts/test-applications.mjs [baseUrl]
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
const ORIGIN = new URL(env.NEXT_PUBLIC_SITE_URL || BASE).origin

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

const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(path.join(path.dirname(require_.resolve('sql.js')), 'sql-wasm.wasm')) })
const db = new SQL.Database(fs.readFileSync(path.join(root, 'data', 'cgs.db')))
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

const tag = crypto.randomUUID().slice(0, 8)
const email = `smoke-app-${tag}@example.org`
const fullName = `Review Path ${tag}`

console.log('\nApplication review path test\n')

// ── 1. Submit an application with a CV ────────────────────────────────────
const form = new FormData()
form.set('fullName', fullName)
form.set('preferredName', 'Review')
form.set('email', email)
form.set('phone', '+92 300 7654321')
form.set('country', 'PK')
form.set('city', 'Lahore')
form.set('currentStatus', 'Working Professional')
form.set('institution', 'Application Review Test Org')
form.set('degree', 'BS Cybersecurity')
form.set('currentYear', 'Not applicable')
form.set('divisions', 'cybersecurity|community')
form.set('primaryDivision', 'cybersecurity')
form.set('otherDivision', '')
form.set('skills', 'Cybersecurity fundamentals|OSINT')
form.set('skillLevel', 'Advanced')
form.set('yearsExperience', '3')
form.set('previousExperience', 'Blue team operations.')
form.set('projects', 'Threat hunting labs.')
form.set('certifications', 'None')
form.set('cyberAreas', 'Web Security')
form.set('declarations', 'accuracy|conduct|commitment|notice')
form.set('cv', new Blob([Buffer.from('%PDF-1.4 application review test')], { type: 'application/pdf' }), 'cv.pdf')

const submit = await fetch(`${BASE}/api/join-application`, {
  method: 'POST',
  headers: { Origin: ORIGIN },
  body: form,
})
const submitText = await submit.text()
check('application submitted', submit.status === 200 && /reference/i.test(submitText), `status=${submit.status} ${submitText.slice(0, 120)}`)
const reference = (submitText.match(/CGS-[A-Z0-9-]+/i) || [])[0] ?? null

// ── 2. Admin applications view lists it ───────────────────────────────────
const view = await fetch(`${BASE}${base}?view=applications`, { headers: { Cookie: cookie } })
const viewHtml = await view.text()
check('applications view renders', view.status === 200, `status=${view.status}`)
check('application listed in admin UI', viewHtml.includes(email) || (reference ? viewHtml.includes(reference) : false))

// ── 3. Signed CV URL serves the PDF ──────────────────────────────────────
const signedPath = (viewHtml.match(/\/api\/admin\/private-file\?[^"'\s]+/) || [])[0] ?? null
check('signed private-file URL rendered', Boolean(signedPath), signedPath ?? 'not found')

if (signedPath) {
  const cv = await fetch(`${BASE}${signedPath.replace(/&amp;/g, '&')}`)
  const body = Buffer.from(await cv.arrayBuffer())
  check(
    'signed URL serves the CV as a PDF',
    cv.status === 200 && body.subarray(0, 5).toString() === '%PDF-',
    `status=${cv.status} head=${body.subarray(0, 8).toString()}`,
  )

  // Tampering with the signature must fail.
  const tampered = signedPath.replace(/sig=[0-9a-f]{8}/, 'sig=deadbeef')
  const bad = await fetch(`${BASE}${tampered.replace(/&amp;/g, '&')}`)
  check('tampered signature is rejected', bad.status === 404, `status=${bad.status}`)
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exitCode = failed > 0 ? 1 : 0
