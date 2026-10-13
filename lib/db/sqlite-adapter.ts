import { randomUUID } from 'crypto'
import { getDatabase, refreshDatabaseIfStale, saveDatabase } from './client'
import { applySchema } from './schema'
import { verifyPassword } from '../security/password'

/**
 * SQLite-backed, Supabase-compatible query layer.
 *
 * This module provides the small PostgREST-style API surface the application
 * code uses (`from().select/insert/update/delete/upsert/eq/ilike/in/order/
 * limit/single/maybeSingle` plus `auth`) on top of the sql.js database, so
 * the codebase can run without an external Supabase project.
 */

export type PostgrestError = {
  message: string
  details: string
  hint: string
  code: string
}

export type SupaRow = Record<string, any>

/**
 * Result `data` is typed as an intersection so that every call site works
 * without casts: array operations (`map`, `find`, iteration, `length`) and
 * single-row property access (`data.id`) are both available, matching how
 * the Supabase client was used across the codebase.
 */
export type SupaData = SupaRow & SupaRow[]

export type SupabaseQueryResult = {
  data: SupaData | null
  error: PostgrestError | null
  count?: number
}

export type SupabaseSingleResult = SupabaseQueryResult

export type SupabaseAnyResult = SupabaseQueryResult

type TableMeta = {
  /** Columns stored as INTEGER 0/1 that must round-trip as JS booleans. */
  booleans: string[]
  /** Columns stored as TEXT JSON that must round-trip as JS objects. */
  jsons: string[]
}

const TABLE_META: Record<string, TableMeta> = {
  admin_users: { booleans: ['active', 'is_protected'], jsons: ['permission_keys'] },
  online_sessions: {
    booleans: ['is_published', 'is_active', 'registration_open', 'attendance_open'],
    jsons: [],
  },
  cgs_speakers: { booleans: ['is_active'], jsons: ['social_links'] },
  cgs_session_speakers: { booleans: [], jsons: [] },
  cgs_registrants: { booleans: [], jsons: [] },
  cgs_session_registrations: { booleans: [], jsons: [] },
  cgs_attendance_records: { booleans: [], jsons: [] },
  cgs_managed_content: { booleans: [], jsons: [] },
  cgs_inbox_messages: { booleans: [], jsons: ['metadata'] },
  cgs_portal_settings: { booleans: [], jsons: [] },
  cgs_payment_ledger: { booleans: [], jsons: [] },
  cgs_google_sheet_connections: { booleans: ['is_active'], jsons: [] },
  cgs_google_sync_runs: { booleans: [], jsons: ['details'] },
  applications: { booleans: [], jsons: [] },
  admin_audit_log: { booleans: [], jsons: ['details'] },
}

const IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/

let readyPromise: Promise<void> | null = null

/** Ensures the database is loaded and the schema is applied exactly once. */
function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      const db = await getDatabase()
      applySchema(db)
      await saveDatabase()
    })()
  }
  return readyPromise
}

function mkError(code: string, message: string): PostgrestError {
  return { message, details: '', hint: '', code }
}

/** Maps sql.js runtime errors to PostgREST-style error codes. */
function toPostgrestError(err: unknown): PostgrestError {
  // Already-mapped errors pass through unchanged.
  if (
    err &&
    typeof err === 'object' &&
    typeof (err as PostgrestError).code === 'string' &&
    typeof (err as PostgrestError).message === 'string'
  ) {
    return err as PostgrestError
  }
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('UNIQUE constraint failed')) {
    return mkError('23505', `Duplicate key value violates unique constraint: ${message}`)
  }
  if (message.includes('NOT NULL constraint failed')) {
    return mkError('23502', `Null value violates not-null constraint: ${message}`)
  }
  if (message.includes('FOREIGN KEY constraint failed')) {
    return mkError('23503', `Foreign key violation: ${message}`)
  }
  if (message.includes('no such table')) {
    return mkError('42P01', message)
  }
  return mkError('SQLITE_ERROR', message)
}

/** Primary-key column for tables that use it (only admin_users differs). */
function idColumn(table: string): string {
  return table === 'admin_users' ? 'user_id' : 'id'
}

/** Table columns that receive auto timestamps on insert. */
const AUTO_TIMESTAMP_COLUMNS: Record<string, string[]> = {
  online_sessions: ['created_at', 'updated_at'],
  cgs_speakers: ['created_at', 'updated_at'],
  cgs_session_speakers: ['created_at'],
  cgs_registrants: ['created_at', 'updated_at'],
  cgs_session_registrations: ['registered_at'],
  cgs_attendance_records: ['marked_at'],
  cgs_managed_content: ['created_at', 'updated_at'],
  cgs_inbox_messages: ['created_at', 'updated_at'],
  cgs_portal_settings: ['created_at', 'updated_at'],
  cgs_payment_ledger: ['created_at', 'updated_at'],
  cgs_google_sheet_connections: ['created_at', 'updated_at'],
  cgs_google_sync_runs: ['created_at'],
  applications: ['created_at', 'updated_at'],
  admin_audit_log: ['created_at'],
}

function toDbValue(table: string, column: string, value: any): any {
  if (value === undefined) return null
  const meta = TABLE_META[table]
  if (meta?.booleans.includes(column)) {
    if (value === true) return 1
    if (value === false) return 0
    if (value === null) return null
    return value === 1 || value === '1' ? 1 : 0
  }
  if (meta?.jsons.includes(column)) {
    if (value === null || typeof value === 'string') return value
    return JSON.stringify(value)
  }
  return value
}

function fromDbValue(table: string, column: string, value: any): any {
  if (value === null || value === undefined) return null
  const meta = TABLE_META[table]
  if (meta?.booleans.includes(column)) {
    return value === 1 || value === '1' || value === true
  }
  if (meta?.jsons.includes(column)) {
    if (typeof value !== 'string') return value
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

async function runRows(sql: string, params: any[] = []): Promise<SupaRow[]> {
  await refreshDatabaseIfStale()
  const db = await getDatabase()
  const stmt = db.prepare(sql)
  try {
    stmt.bind(params)
    const rows: SupaRow[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as SupaRow)
    }
    return rows
  } catch (err) {
    throw toPostgrestError(err)
  } finally {
    stmt.free()
  }
}

async function runWrite(sql: string, params: any[] = []): Promise<void> {
  await refreshDatabaseIfStale()
  const db = await getDatabase()
  const stmt = db.prepare(sql)
  try {
    stmt.run(params)
  } catch (err) {
    throw toPostgrestError(err)
  } finally {
    stmt.free()
  }
}

type Filter = { sql: string; params: any[] }

function validateIdentifier(name: string): boolean {
  return IDENTIFIER.test(name)
}

class QueryBuilder {
  private readonly table: string
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | null = null
  private selectColumns = '*'
  private wantCount = false
  private headOnly = false
  private filters: Filter[] = []
  private orders: string[] = []
  private limitValue?: number
  private rangeValue?: { from: number; to: number }
  private payload: SupaRow[] = []
  private upsertConflict?: string
  private wantSelect = false
  private singleMode: 'none' | 'maybe' | 'strict' = 'none'

  constructor(table: string) {
    this.table = table
  }

  select(
    columns?: string,
    options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean },
  ): this {
    if (
      this.op === 'insert' ||
      this.op === 'update' ||
      this.op === 'delete' ||
      this.op === 'upsert'
    ) {
      // `.select()` chained after a mutation requests the mutated rows.
      this.wantSelect = true
    } else if (this.op === null) {
      this.op = 'select'
    }
    if (columns !== undefined) this.selectColumns = columns
    if (options?.count) this.wantCount = true
    if (options?.head) this.headOnly = true
    return this
  }

  insert(value: SupaRow | SupaRow[]): this {
    this.op = 'insert'
    this.payload = Array.isArray(value) ? value : [value]
    return this
  }

  upsert(
    value: SupaRow | SupaRow[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): this {
    this.op = 'upsert'
    this.payload = Array.isArray(value) ? value : [value]
    this.upsertConflict = options?.onConflict
    return this
  }

  update(value: SupaRow): this {
    this.op = 'update'
    this.payload = [value]
    return this
  }

  delete(): this {
    this.op = 'delete'
    return this
  }

  eq(column: string, value: any): this {
    this.filters.push(this.comparison(column, value, '='))
    return this
  }

  neq(column: string, value: any): this {
    this.filters.push(this.comparison(column, value, '<>'))
    return this
  }

  gt(column: string, value: any): this {
    this.filters.push(this.comparison(column, value, '>'))
    return this
  }

  gte(column: string, value: any): this {
    this.filters.push(this.comparison(column, value, '>='))
    return this
  }

  lt(column: string, value: any): this {
    this.filters.push(this.comparison(column, value, '<'))
    return this
  }

  lte(column: string, value: any): this {
    this.filters.push(this.comparison(column, value, '<='))
    return this
  }

  like(column: string, pattern: string): this {
    this.filters.push({ sql: `${column} LIKE ?`, params: [pattern] })
    return this
  }

  ilike(column: string, pattern: string): this {
    // SQLite's LIKE is already case-insensitive for ASCII characters.
    this.filters.push({ sql: `${column} LIKE ?`, params: [pattern] })
    return this
  }

  is(column: string, value: any): this {
    if (value === null) {
      this.filters.push({ sql: `${column} IS NULL`, params: [] })
    } else if (value === true) {
      this.filters.push({ sql: `${column} IS ?`, params: [1] })
    } else if (value === false) {
      this.filters.push({ sql: `${column} IS ?`, params: [0] })
    } else {
      this.filters.push({ sql: `${column} IS ?`, params: [value] })
    }
    return this
  }

  in(column: string, values: any[]): this {
    const list = values.filter((value) => value !== undefined && value !== null)
    if (list.length === 0) {
      this.filters.push({ sql: '1 = 0', params: [] })
      return this
    }
    // Chunk IN lists so very large id sets stay under SQLite's variable limit.
    const CHUNK = 800
    const chunks: string[] = []
    const params: any[] = []
    for (let i = 0; i < list.length; i += CHUNK) {
      const part = list.slice(i, i + CHUNK)
      chunks.push(`${column} IN (${part.map(() => '?').join(', ')})`)
      for (const value of part) params.push(toDbValue(this.table, column, value))
    }
    this.filters.push({ sql: `(${chunks.join(' OR ')})`, params })
    return this
  }

  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string },
  ): this {
    const direction = options?.ascending === false ? 'DESC' : 'ASC'
    this.orders.push(`${column} ${direction}`)
    return this
  }

  limit(count: number): this {
    this.limitValue = count
    return this
  }

  range(from: number, to: number): this {
    this.rangeValue = { from, to }
    return this
  }

  single(): this {
    this.singleMode = 'strict'
    return this
  }

  maybeSingle(): this {
    this.singleMode = 'maybe'
    return this
  }

  /** PostgREST JSON-path shorthand: `column->>key` maps to json_extract. */
  private comparison(column: string, value: any, operator: string): Filter {
    const jsonTextMatch = column.match(/^([a-zA-Z_][a-zA-Z0-9_]*)->>(.+)$/)
    if (jsonTextMatch) {
      const [, base, key] = jsonTextMatch
      return {
        sql: `json_extract(${base}, '$.${key.replace(/'/g, "''")}') ${operator} ?`,
        params: [value],
      }
    }
    return {
      sql: `${column} ${operator} ?`,
      params: [toDbValue(this.table, column, value)],
    }
  }

  private buildWhere(): { sql: string; params: any[] } {
    if (this.filters.length === 0) return { sql: '', params: [] }
    const sql = `WHERE ${this.filters.map((f) => f.sql).join(' AND ')}`
    const params = this.filters.flatMap((f) => f.params)
    return { sql, params }
  }

  private buildOrderLimit(): string {
    const parts: string[] = []
    if (this.orders.length > 0) parts.push(`ORDER BY ${this.orders.join(', ')}`)
    if (this.rangeValue) {
      const count = this.rangeValue.to - this.rangeValue.from + 1
      parts.push(`LIMIT ${count} OFFSET ${this.rangeValue.from}`)
    } else if (this.limitValue !== undefined) {
      parts.push(`LIMIT ${this.limitValue}`)
    }
    return parts.join(' ')
  }

  /** Builds the column list, validating identifiers. */
  private buildColumns(): string | null {
    if (this.selectColumns.trim() === '*') return '*'
    const columns = this.selectColumns.split(',').map((c) => c.trim())
    for (const column of columns) {
      if (!validateIdentifier(column)) return null
    }
    return columns.join(', ')
  }

  /** Prepares an insert/update payload: strips undefined, converts values. */
  private prepareRow(raw: SupaRow): SupaRow {
    const row: SupaRow = {}
    for (const [key, value] of Object.entries(raw)) {
      if (value === undefined) continue
      if (!validateIdentifier(key)) continue
      row[key] = toDbValue(this.table, key, value)
    }
    // Auto-generate the primary key when the payload omits it.
    const pk = idColumn(this.table)
    if (!(pk in row)) {
      row[pk] = randomUUID()
    }
    // Auto-fill ISO timestamps for tables that declare them.
    const now = new Date().toISOString()
    const autoColumns = AUTO_TIMESTAMP_COLUMNS[this.table] ?? []
    for (const column of autoColumns) {
      if (!(column in row)) row[column] = now
    }
    return row
  }

  private finalizeSelect(rows: SupaRow[]): SupabaseQueryResult {
    const converted = rows.map((row) => this.convertRow(row))
    if (this.singleMode === 'none') {
      return { data: converted as SupaData, error: null }
    }
    if (converted.length === 1) {
      return { data: converted[0] as SupaData, error: null }
    }
    if (converted.length === 0) {
      if (this.singleMode === 'strict') {
        return {
          data: null,
          error: mkError(
            'PGRST116',
            'JSON object requested, multiple (or no) rows returned',
          ),
        }
      }
      return { data: null, error: null }
    }
    return {
      data: null,
      error: mkError('PGRST116', 'JSON object requested, multiple (or no) rows returned'),
    }
  }

  private convertRow(row: SupaRow): SupaRow {
    const converted: SupaRow = {}
    for (const [key, value] of Object.entries(row)) {
      converted[key] = fromDbValue(this.table, key, value)
    }
    return converted
  }

  private async runSelect(): Promise<SupabaseQueryResult> {
    const columns = this.buildColumns()
    if (!columns) {
      return { data: null, error: mkError('PGRST100', 'Invalid column selection.') }
    }

    const where = this.buildWhere()

    if (this.wantCount) {
      const countRows = await runRows(
        `SELECT COUNT(*) AS count FROM ${this.table} ${where.sql}`,
        where.params,
      )
      const count = Number(countRows[0]?.count ?? 0)
      if (this.headOnly) {
        return { data: [] as unknown as SupaData, error: null, count }
      }
      const rows = await runRows(
        `SELECT ${columns} FROM ${this.table} ${where.sql} ${this.buildOrderLimit()}`,
        where.params,
      )
      const converted = rows.map((row) => this.convertRow(row))
      return { data: converted as SupaData, error: null, count }
    }

    const rows = await runRows(
      `SELECT ${columns} FROM ${this.table} ${where.sql} ${this.buildOrderLimit()}`,
      where.params,
    )
    return this.finalizeSelect(rows)
  }

  private async runInsert(): Promise<SupabaseQueryResult> {
    const prepared: SupaRow[] = []
    try {
      for (const raw of this.payload) {
        const row = this.prepareRow(raw)
        prepared.push(row)
        const keys = Object.keys(row)
        const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${keys
          .map(() => '?')
          .join(', ')})`
        await runWrite(sql, keys.map((key) => row[key]))
      }
      await saveDatabase()
    } catch (err) {
      return { data: null, error: toPostgrestError(err) }
    }

    if (this.wantSelect) {
      const pk = idColumn(this.table)
      const ids = prepared.map((row) => row[pk]).filter((value) => value != null)
      if (ids.length === 0) return { data: [] as unknown as SupaData, error: null }
      const columns = this.buildColumns() ?? '*'
      const rows = await runRows(
        `SELECT ${columns} FROM ${this.table} WHERE ${pk} IN (${ids
          .map(() => '?')
          .join(', ')})`,
        ids,
      )
      return this.finalizeSelect(rows)
    }
    return { data: null, error: null }
  }

  private async runUpsert(): Promise<SupabaseQueryResult> {
    const conflictTarget = this.upsertConflict ?? idColumn(this.table)
    const conflictValues: any[] = []
    try {
      for (const raw of this.payload) {
        const row = this.prepareRow(raw)
        if (row[conflictTarget] !== undefined && row[conflictTarget] !== null) {
          conflictValues.push(row[conflictTarget])
        }
        const keys = Object.keys(row).filter((key) => key !== conflictTarget)
        const conflictClause =
          keys.length > 0
            ? `DO UPDATE SET ${keys.map((key) => `${key} = excluded.${key}`).join(', ')}`
            : 'DO NOTHING'
        const sql = `INSERT INTO ${this.table} (${Object.keys(row).join(', ')}) VALUES (${Object.keys(
          row,
        )
          .map(() => '?')
          .join(', ')}) ON CONFLICT(${conflictTarget}) ${conflictClause}`
        await runWrite(sql, Object.keys(row).map((key) => row[key]))
      }
      await saveDatabase()
    } catch (err) {
      return { data: null, error: toPostgrestError(err) }
    }

    if (this.wantSelect && conflictValues.length > 0) {
      const columns = this.buildColumns() ?? '*'
      const rows = await runRows(
        `SELECT ${columns} FROM ${this.table} WHERE ${conflictTarget} IN (${conflictValues
          .map(() => '?')
          .join(', ')})`,
        conflictValues,
      )
      return this.finalizeSelect(rows)
    }
    return { data: null, error: null }
  }

  private async runUpdate(): Promise<SupabaseQueryResult> {
    const where = this.buildWhere()
    const raw = this.payload[0] ?? {}
    const row: SupaRow = {}
    for (const [key, value] of Object.entries(raw)) {
      if (value === undefined) continue
      if (!validateIdentifier(key)) continue
      row[key] = toDbValue(this.table, key, value)
    }
    if (Object.keys(row).length === 0) {
      return { data: null, error: mkError('PGRST103', 'Empty update payload.') }
    }

    try {
      const setClause = Object.keys(row)
        .map((key) => `${key} = ?`)
        .join(', ')
      await runWrite(
        `UPDATE ${this.table} SET ${setClause} ${where.sql}`,
        [...Object.keys(row).map((key) => row[key]), ...where.params],
      )
      await saveDatabase()
    } catch (err) {
      return { data: null, error: toPostgrestError(err) }
    }

    if (this.wantSelect) {
      const columns = this.buildColumns() ?? '*'
      const rows = await runRows(
        `SELECT ${columns} FROM ${this.table} ${where.sql} ${this.buildOrderLimit()}`,
        where.params,
      )
      return this.finalizeSelect(rows)
    }
    return { data: null, error: null }
  }

  private async runDelete(): Promise<SupabaseQueryResult> {
    const where = this.buildWhere()
    let selected: SupaRow[] = []
    if (this.wantSelect) {
      const columns = this.buildColumns() ?? '*'
      selected = await runRows(
        `SELECT ${columns} FROM ${this.table} ${where.sql} ${this.buildOrderLimit()}`,
        where.params,
      )
    }
    try {
      await runWrite(`DELETE FROM ${this.table} ${where.sql}`, where.params)
      await saveDatabase()
    } catch (err) {
      return { data: null, error: toPostgrestError(err) }
    }
    if (this.wantSelect) {
      return this.finalizeSelect(selected)
    }
    return { data: null, error: null }
  }

  private async execute(): Promise<SupabaseAnyResult> {
    if (!validateIdentifier(this.table)) {
      return { data: null, error: mkError('PGRST100', 'Invalid table name.') }
    }
    try {
      await ensureReady()
    } catch (err) {
      // Never reject the thenable: call sites expect { data, error }.
      return { data: null, error: toPostgrestError(err) }
    }
    switch (this.op) {
      case 'select':
        return this.runSelect()
      case 'insert':
        return this.runInsert()
      case 'upsert':
        return this.runUpsert()
      case 'update':
        return this.runUpdate()
      case 'delete':
        return this.runDelete()
      default:
        return {
          data: null,
          error: mkError('PGRST100', 'No query operation specified (select/insert/update/delete).'),
        }
    }
  }

  then<TResult1 = SupabaseQueryResult, TResult2 = never>(
    onfulfilled?: ((value: SupabaseQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(
      onfulfilled as unknown as (value: SupabaseAnyResult) => TResult1 | PromiseLike<TResult1>,
      onrejected,
    )
  }
}

export type SqliteClient = {
  from: (table: string) => QueryBuilder
  auth: {
    signOut: (options?: { scope?: string }) => Promise<{ error: null }>
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<{
      data: { user: { id: string; email: string } | null }
      error: PostgrestError | null
    }>
    admin: {
      createUser: (attributes: {
        email: string
        password: string
        email_confirm?: boolean
      }) => Promise<{
        data: { user: { id: string; email: string } | null }
        error: PostgrestError | null
      }>
      deleteUser: (id: string) => Promise<{ data: null; error: PostgrestError | null }>
      signOut: (userId: string, scope?: string) => Promise<{ error: null }>
      listUsers: (options?: { page?: number; perPage?: number }) => Promise<{
        data: { users: Array<{ id: string; email: string | null }> }
        error: PostgrestError | null
      }>
    }
  }
}

export function createSqliteClient(): SqliteClient {
  return {
    from(table: string) {
      return new QueryBuilder(table)
    },

    auth: {
      async signOut() {
        // Sessions are cookie-based in this platform; nothing to revoke here.
        return { error: null }
      },

      async signInWithPassword({ email, password }) {
        const normalized = String(email ?? '').trim().toLowerCase()
        if (!normalized) {
          return {
            data: { user: null },
            error: mkError('invalid_credentials', 'Invalid login credentials'),
          }
        }
        try {
          await ensureReady()
          const rows = await runRows(
            'SELECT user_id, email, password_hash, role, active FROM admin_users WHERE email = ?',
            [normalized],
          )
          const row = rows[0]
          if (!row) {
            return {
              data: { user: null },
              error: mkError('invalid_credentials', 'Invalid login credentials'),
            }
          }
          const passwordOk = await verifyPassword(password, String(row.password_hash ?? ''))
          if (!passwordOk) {
            return {
              data: { user: null },
              error: mkError('invalid_credentials', 'Invalid login credentials'),
            }
          }
          if (row.active !== 1 && row.active !== true) {
            return {
              data: { user: null },
              error: mkError('email_not_confirmed', 'Email not confirmed'),
            }
          }
          return {
            data: { user: { id: String(row.user_id), email: String(row.email) } },
            error: null,
          }
        } catch (err) {
          return {
            data: { user: null },
            error: toPostgrestError(err),
          }
        }
      },

      admin: {
        async createUser({ email, password, email_confirm }) {
          const normalized = String(email ?? '').trim().toLowerCase()
          if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
            return {
              data: { user: null },
              error: mkError('validation_failed', 'A valid email address is required.'),
            }
          }
          if (typeof password !== 'string' || password.length < 12) {
            return {
              data: { user: null },
              error: mkError('validation_failed', 'Password must be at least 12 characters long.'),
            }
          }
          try {
            await ensureReady()
            const existing = await runRows(
              'SELECT user_id FROM admin_users WHERE email = ?',
              [normalized],
            )
            if (existing.length > 0) {
              return {
                data: { user: null },
                error: mkError(
                  'user_already_exists',
                  'A user with this email address has already been registered',
                ),
              }
            }
            // The profile row is created by the caller (admin_users insert);
            // we only mint the identity id here, mirroring Supabase Auth.
            return {
              data: { user: { id: randomUUID(), email: normalized } },
              error: null,
            }
          } catch (err) {
            return { data: { user: null }, error: toPostgrestError(err) }
          }
        },

        async deleteUser(id) {
          try {
            await ensureReady()
            await runWrite('DELETE FROM admin_users WHERE user_id = ?', [id])
            await saveDatabase()
            return { data: null, error: null }
          } catch (err) {
            return { data: null, error: toPostgrestError(err) }
          }
        },

        async signOut() {
          return { error: null }
        },

        async listUsers(options) {
          try {
            await ensureReady()
            const page = options?.page ?? 1
            const perPage = options?.perPage ?? 50
            const rows = await runRows(
              'SELECT user_id, email FROM admin_users ORDER BY created_at ASC',
            )
            const users = rows
              .slice((page - 1) * perPage, page * perPage)
              .map((row) => ({
                id: String(row.user_id),
                email: row.email === null || row.email === undefined ? null : String(row.email),
              }))
            return { data: { users }, error: null }
          } catch (err) {
            return { data: { users: [] }, error: toPostgrestError(err) }
          }
        },
      },
    },
  }
}

export default createSqliteClient
