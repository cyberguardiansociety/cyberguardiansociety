/**
 * Runtime verification for the SQLite-backed Supabase-compatible query layer.
 * Runs against an isolated temporary database and exercises every query
 * pattern used across the platform.
 *
 * Usage: npx tsx scripts/test-adapter.ts
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { createSqliteClient } from '../lib/db/sqlite-adapter'
import { hashPassword } from '../lib/security/password'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cgs-adapter-test-'))
process.chdir(tempDir)

const client = createSqliteClient()
let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed++
    console.log(`  ✔ ${name}`)
  } else {
    failed++
    console.error(`  ✘ ${name}`, detail !== undefined ? JSON.stringify(detail).slice(0, 300) : '')
  }
}

async function main() {
  console.log('Adapter verification suite\n')

  // ── 1. Schema + seeding ────────────────────────────────────────────
  const settings = await client.from('cgs_portal_settings').select('key, value')
  check('schema initialized with portal settings', settings.error === null && (settings.data?.length ?? 0) >= 2)

  // ── 2. Insert with boolean + JSON columns, auto id/timestamps ──────
  const speakerId = randomUUID()
  const insertResult = await client
    .from('cgs_speakers')
    .insert({
      id: speakerId,
      name: 'Ada Lovelace',
      title: 'Principal Engineer',
      is_active: true,
      social_links: { website: 'https://example.org' },
    })
    .select('id, name, is_active, social_links, created_at')
    .maybeSingle()
  check('insert().select().maybeSingle() returns row', insertResult.error === null && insertResult.data?.id === speakerId)
  check(
    'boolean roundtrip (is_active === true)',
    insertResult.data?.is_active === true,
    insertResult.data,
  )
  check(
    'JSON roundtrip (social_links object)',
    insertResult.data?.social_links?.website === 'https://example.org',
    insertResult.data,
  )
  check('auto ISO timestamp present', typeof insertResult.data?.created_at === 'string' && insertResult.data.created_at.includes('T'))

  // ── 3. maybeSingle / single semantics ──────────────────────────────
  const none = await client.from('cgs_speakers').select('id').eq('id', 'missing-id').maybeSingle()
  check('maybeSingle on missing row → data null, error null', none.error === null && none.data === null)

  const strict = await client.from('cgs_speakers').select('id').eq('id', 'missing-id').single()
  check('single on missing row → PGRST116 error', strict.error?.code === 'PGRST116' && strict.data === null)

  // ── 4. Filters: eq / ilike / in / order / limit ────────────────────
  await client.from('cgs_speakers').insert([
    { id: randomUUID(), name: 'Grace Hopper', title: 'Rear Admiral', is_active: true },
    { id: randomUUID(), name: 'Alan Turing', title: 'Mathematician', is_active: false },
  ])

  const many = await client.from('cgs_speakers').select('id').maybeSingle()
  check('maybeSingle on multiple rows → PGRST116 error', many.error?.code === 'PGRST116')

  const ilike = await client.from('cgs_speakers').select('id').ilike('name', '%GRACE%')
  check('ilike case-insensitive match', (ilike.data ?? []).length === 1)

  const inQ = await client.from('cgs_speakers').select('id').in('id', [speakerId])
  check('in() filter', (inQ.data ?? []).length === 1 && inQ.data?.[0]?.id === speakerId)

  const ordered = await client
    .from('cgs_speakers')
    .select('name')
    .order('name', { ascending: false })
    .limit(1)
  check('order desc + limit', ordered.data?.[0]?.name === 'Grace Hopper', ordered.data)

  const activeOnly = await client.from('cgs_speakers').select('id').eq('is_active', true)
  check('boolean filter eq(true)', (activeOnly.data ?? []).length === 2, activeOnly.data)

  // ── 5. count exact (head and with rows) ────────────────────────────
  const countHead = await client.from('cgs_speakers').select('*', { count: 'exact', head: true })
  check('count exact head → data [] with count 3', Array.isArray(countHead.data) && countHead.data.length === 0 && countHead.count === 3, countHead)

  const countRows = await client.from('cgs_speakers').select('id', { count: 'exact' })
  check('count exact with rows', countRows.count === 3 && (countRows.data ?? []).length === 3, countRows.count)

  // ── 6. JSON-path filter (metadata->>source) ────────────────────────
  await client.from('cgs_inbox_messages').insert({
    kind: 'contact',
    name: 'Test User',
    email: 'test@example.org',
    message: 'hello',
    metadata: { source: 'speaker-application' },
    status: 'new',
  })
  const jsonPath = await client
    .from('cgs_inbox_messages')
    .select('id, metadata')
    .eq('metadata->>source', 'speaker-application')
  check('metadata->>source filter matches', (jsonPath.data ?? []).length === 1, jsonPath.data)
  check('metadata parsed to object', typeof jsonPath.data?.[0]?.metadata === 'object' && jsonPath.data[0].metadata.source === 'speaker-application')

  // ── 7. upsert with onConflict ──────────────────────────────────────
  const email = 'upsert@example.org'
  await client.from('cgs_registrants').insert({ email, name: 'Original Name' })
  const upsertResult = await client
    .from('cgs_registrants')
    .upsert([{ email, name: 'Updated Name' }], { onConflict: 'email' })
    .select('id, email, name')
  const upsertRows = upsertResult.data ?? []
  check('upsert updates existing row', upsertRows.length === 1 && upsertRows[0].name === 'Updated Name', upsertRows)

  // ── 8. unique violation → 23505 ────────────────────────────────────
  const sessionId = randomUUID()
  const regId = randomUUID()
  await client.from('online_sessions').insert({ id: sessionId, title: 'Test Session', starts_at: new Date().toISOString() })
  await client.from('cgs_registrants').insert({ id: regId, email: 'att@example.org', name: 'Attendee' })
  const firstMark = await client.from('cgs_attendance_records').insert({ session_id: sessionId, registrant_id: regId, method: 'portal' })
  const dupMark = await client.from('cgs_attendance_records').insert({ session_id: sessionId, registrant_id: regId, method: 'portal' })
  check('first attendance insert succeeds', firstMark.error === null)
  check('duplicate attendance insert → 23505', dupMark.error?.code === '23505', dupMark.error)

  // ── 9. attendance re-query pattern (insert().select().single()) ────
  const regId2 = randomUUID()
  await client.from('cgs_registrants').insert({ id: regId2, email: 'att2@example.org', name: 'Attendee 2' })
  const marked = await client
    .from('cgs_attendance_records')
    .insert({ session_id: sessionId, registrant_id: regId2, method: 'portal' })
    .select('id, marked_at')
    .single()
  check('insert().select().single() returns row', marked.error === null && typeof marked.data?.id === 'string', marked)

  // ── 10. update / delete with select ────────────────────────────────
  const updated = await client
    .from('cgs_speakers')
    .update({ title: 'Countess of Lovelace' })
    .eq('id', speakerId)
    .select('id, title')
    .maybeSingle()
  check('update().select().maybeSingle()', updated.data?.title === 'Countess of Lovelace', updated)

  const deleted = await client
    .from('cgs_speakers')
    .delete()
    .eq('id', speakerId)
    .select('id')
    .maybeSingle()
  check('delete().select().maybeSingle() returns deleted row', deleted.data?.id === speakerId, deleted)

  const auditLogIds = [randomUUID(), randomUUID()]
  const auditInsert = await client.from('admin_audit_log').insert(
    auditLogIds.map((id) => ({
      id,
      actor_id: 'test-admin',
      action: 'test',
      entity: 'test_fixture',
    })),
  )
  const auditDelete = await client.from('admin_audit_log').delete()
  const auditRowsAfterDelete = await client.from('admin_audit_log').select('id')
  check(
    'delete() without filters clears every audit log row',
    auditInsert.error === null && auditDelete.error === null && (auditRowsAfterDelete.data ?? []).length === 0,
    { auditInsert: auditInsert.error, auditDelete: auditDelete.error, remaining: auditRowsAfterDelete.data },
  )

  // ── 11. large IN chunking (>800 values) ────────────────────────────
  const bigIds: string[] = []
  const rows: Record<string, any>[] = []
  for (let i = 0; i < 900; i++) {
    const id = randomUUID()
    bigIds.push(id)
    rows.push({ id, email: `bulk${i}@example.org`, name: `Bulk ${i}` })
  }
  const bulkInsert = await client.from('cgs_registrants').insert(rows)
  check('bulk insert 900 rows', bulkInsert.error === null, bulkInsert.error?.message)
  const bigIn = await client.from('cgs_registrants').select('id').in('id', bigIds)
  check('in() with 900 values returns 900 rows', (bigIn.data ?? []).length === 900)

  // ── 12. auth: signInWithPassword ───────────────────────────────────
  const adminId = randomUUID()
  const adminEmail = 'auth-test@example.org'
  const adminPass = 'S3curePassw0rd!'
  await client.from('admin_users').insert({
    user_id: adminId,
    email: adminEmail,
    password_hash: await hashPassword(adminPass),
    role: 'super_admin',
    active: true,
  })
  const goodLogin = await client.auth.signInWithPassword({ email: adminEmail, password: adminPass })
  check('auth login succeeds with correct password', goodLogin.error === null && goodLogin.data?.user?.id === adminId, goodLogin.error)
  const badLogin = await client.auth.signInWithPassword({ email: adminEmail, password: 'wrong-password' })
  check('auth login fails with wrong password', badLogin.error !== null && badLogin.data?.user === null)

  const listUsers = await client.auth.admin.listUsers({ page: 1, perPage: 100 })
  check('auth.admin.listUsers returns users', listUsers.error === null && listUsers.data.users.some((u) => u.id === adminId))

  // ── 13. insert with undefined keys stripped (speakerIds: undefined) ──
  const sessionInsert = await client
    .from('online_sessions')
    .insert({
      id: randomUUID(),
      title: 'Undefined Stripping',
      starts_at: new Date().toISOString(),
      speakerIds: undefined,
    })
    .select('id')
    .maybeSingle()
  check('insert strips undefined keys', sessionInsert.error === null && !!sessionInsert.data?.id, sessionInsert.error)

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exitCode = failed > 0 ? 1 : 0
}

main().catch((err) => {
  console.error('Suite crashed:', err)
  process.exitCode = 1
})
