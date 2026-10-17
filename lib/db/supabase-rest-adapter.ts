import { randomUUID } from 'node:crypto'
import type { PostgrestError, SupabaseQueryResult, SupaData, SupaRow } from './sqlite-adapter'
import type { SupabaseRuntimeConfig } from '../supabase/config'
import { verifyPassword } from '../security/password'

type Filter = { column: string; value: string }
type RestResult = SupabaseQueryResult & { count?: number }

const IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function errorFromBody(body: any, fallback: string): PostgrestError {
  return {
    message: typeof body?.message === 'string' ? body.message : fallback,
    details: typeof body?.details === 'string' ? body.details : '',
    hint: typeof body?.hint === 'string' ? body.hint : '',
    code: typeof body?.code === 'string' ? body.code : 'SUPABASE_ERROR',
  }
}

function normalizeData(value: unknown): SupaData | null {
  if (value === null || value === undefined) return null
  return value as SupaData
}

function inValue(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const escaped = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}

class SupabaseRestQueryBuilder {
  private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private columns = '*'
  private payload: SupaRow | SupaRow[] | null = null
  private readonly filters: Filter[] = []
  private readonly orderings: string[] = []
  private readonly params = new URLSearchParams()
  private readonly options: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean } = {}
  private limitValue?: number
  private rangeValue?: { from: number; to: number }
  private conflict?: string
  private ignoreDuplicates = false
  private returnRows = false
  private singleMode: 'none' | 'maybe' | 'strict' = 'none'

  constructor(
    private readonly config: SupabaseRuntimeConfig,
    private readonly table: string,
  ) {}

  select(
    columns = '*',
    options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean },
  ): this {
    this.columns = columns
    this.options.count = options?.count
    this.options.head = options?.head
    if (this.operation !== 'select') this.returnRows = true
    return this
  }

  insert(value: SupaRow | SupaRow[]): this {
    this.operation = 'insert'
    this.payload = value
    return this
  }

  upsert(
    value: SupaRow | SupaRow[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): this {
    this.operation = 'upsert'
    this.payload = value
    this.conflict = options?.onConflict
    this.ignoreDuplicates = Boolean(options?.ignoreDuplicates)
    return this
  }

  update(value: SupaRow): this {
    this.operation = 'update'
    this.payload = value
    return this
  }

  delete(): this {
    this.operation = 'delete'
    return this
  }

  eq(column: string, value: unknown): this { return this.addFilter(column, 'eq', value) }
  neq(column: string, value: unknown): this { return this.addFilter(column, 'neq', value) }
  gt(column: string, value: unknown): this { return this.addFilter(column, 'gt', value) }
  gte(column: string, value: unknown): this { return this.addFilter(column, 'gte', value) }
  lt(column: string, value: unknown): this { return this.addFilter(column, 'lt', value) }
  lte(column: string, value: unknown): this { return this.addFilter(column, 'lte', value) }
  like(column: string, value: string): this { return this.addFilter(column, 'like', value) }
  ilike(column: string, value: string): this { return this.addFilter(column, 'ilike', value) }

  filter(column: string, operator: string, value: unknown): this {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*(?:->>?[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(column)) {
      throw new Error('Invalid filter column.')
    }
    if (!/^[a-z]+$/.test(operator)) throw new Error('Invalid filter operator.')
    return this.addFilter(column, operator, value)
  }

  match(values: Record<string, unknown>): this {
    for (const [column, value] of Object.entries(values)) this.eq(column, value)
    return this
  }

  is(column: string, value: unknown): this {
    const normalized = value === null ? 'null' : value === true ? 'true' : value === false ? 'false' : String(value)
    this.filters.push({ column, value: `is.${normalized}` })
    return this
  }

  not(column: string, operator: string, value: unknown): this {
    if (operator === 'is' && value === null) {
      this.filters.push({ column, value: 'not.is.null' })
      return this
    }
    const normalized = value === null ? 'null' : String(value)
    this.filters.push({ column, value: `not.${operator}.${normalized}` })
    return this
  }

  in(column: string, values: unknown[]): this {
    const items = values.filter((value) => value !== undefined && value !== null)
    this.filters.push({
      column,
      value: items.length ? `in.(${items.map(inValue).join(',')})` : 'eq.__cgs_no_match__',
    })
    return this
  }

  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string },
  ): this {
    const direction = options?.ascending === false ? 'desc' : 'asc'
    const nullOrder = options?.nullsFirst === undefined ? '' : options.nullsFirst ? '.nullsfirst' : '.nullslast'
    const prefix = options?.referencedTable ? `${options.referencedTable}.` : ''
    this.orderings.push(`${prefix}${column}.${direction}${nullOrder}`)
    return this
  }

  limit(count: number): this {
    this.limitValue = Math.max(0, Math.floor(count))
    return this
  }

  range(from: number, to: number): this {
    this.rangeValue = { from: Math.max(0, Math.floor(from)), to: Math.max(from, Math.floor(to)) }
    return this
  }

  single(): this { this.singleMode = 'strict'; return this }
  maybeSingle(): this { this.singleMode = 'maybe'; return this }

  private addFilter(column: string, operator: string, value: unknown): this {
    const normalized = value === null ? 'null' : String(value)
    this.filters.push({ column, value: `${operator}.${normalized}` })
    return this
  }

  private makeUrl(): URL {
    if (!IDENTIFIER.test(this.table)) throw new Error('Invalid table name.')
    const url = new URL(`${this.config.url}/rest/v1/${this.table}`)
    if (this.operation === 'select' || this.returnRows) url.searchParams.set('select', this.columns)
    for (const filter of this.filters) url.searchParams.append(filter.column, filter.value)
    if (this.orderings.length) url.searchParams.set('order', this.orderings.join(','))
    if (this.conflict) url.searchParams.set('on_conflict', this.conflict)
    if (this.limitValue !== undefined && !this.rangeValue) url.searchParams.set('limit', String(this.limitValue))
    return url
  }

  private async execute(): Promise<RestResult> {
    try {
      const url = this.makeUrl()
      const headers = new Headers({
        apikey: this.config.secretKey,
        accept: this.singleMode === 'strict' ? 'application/vnd.pgrst.object+json' : 'application/json',
      })
      // Current sb_secret keys are API keys, not JWTs. Legacy service-role
      // JWTs still need Authorization for PostgREST's database role selection.
      if (!this.config.secretKey.startsWith('sb_secret_')) {
        headers.set('authorization', `Bearer ${this.config.secretKey}`)
      }
      const preferences: string[] = []
      if (this.options.count) preferences.push(`count=${this.options.count}`)
      if (this.operation === 'upsert') {
        preferences.push(this.ignoreDuplicates ? 'resolution=ignore-duplicates' : 'resolution=merge-duplicates')
      }
      if (this.returnRows) preferences.push('return=representation')
      else if (this.operation !== 'select') preferences.push('return=minimal')
      if (preferences.length) headers.set('prefer', preferences.join(','))
      if (this.rangeValue) {
        headers.set('range-unit', 'items')
        headers.set('range', `${this.rangeValue.from}-${this.rangeValue.to}`)
      }

      const method = this.options.head ? 'HEAD' : {
        select: 'GET', insert: 'POST', upsert: 'POST', update: 'PATCH', delete: 'DELETE',
      }[this.operation]
      let body: string | undefined
      if (this.operation === 'insert' || this.operation === 'upsert' || this.operation === 'update') {
        headers.set('content-type', 'application/json')
        body = JSON.stringify(this.payload)
      }

      const response = await fetch(url, { method, headers, body, keepalive: true, cache: 'no-store' })
      const raw = response.status === 204 || method === 'HEAD' ? '' : await response.text()
      let result: any = null
      if (raw) {
        try { result = JSON.parse(raw) } catch { result = null }
      }
      if (!response.ok) {
        return { data: null, error: errorFromBody(result, `Supabase request failed (${response.status}).`) }
      }

      let count: number | undefined
      if (this.options.count) {
        const ranges = response.headers.get('content-range')?.split('/')
        const total = ranges?.[ranges.length - 1]
        if (total && total !== '*') count = Number(total)
      }

      if (this.options.head) return { data: [] as unknown as SupaData, error: null, count }
      if (this.singleMode !== 'none') {
        const rows = Array.isArray(result) ? result : result == null ? [] : [result]
        if (rows.length === 1) return { data: normalizeData(rows[0]), error: null, count }
        if (rows.length === 0 && this.singleMode === 'maybe') return { data: null, error: null, count }
        return {
          data: null,
          error: { message: 'JSON object requested, multiple (or no) rows returned', details: '', hint: '', code: 'PGRST116' },
          count,
        }
      }
      return { data: normalizeData(result), error: null, count }
    } catch (err) {
      return {
        data: null,
        error: { message: err instanceof Error ? err.message : 'Supabase request failed.', details: '', hint: '', code: 'SUPABASE_CONNECTION_ERROR' },
      }
    }
  }

  then<TResult1 = RestResult, TResult2 = never>(
    onfulfilled?: ((value: RestResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined)
  }
}

function storageObjectPath(path: string): string {
  const segments = path.replace(/^\/+/, '').split('/')
  if (!segments.length || segments.some((part) => !part || part === '.' || part === '..')) {
    throw new Error('Invalid storage path.')
  }
  return segments.map((part) => encodeURIComponent(part)).join('/')
}

async function storageError(response: Response): Promise<PostgrestError> {
  let body: any = null
  try { body = await response.json() } catch {}
  return errorFromBody(body, `Supabase Storage request failed (${response.status}).`)
}

function createStorage(config: SupabaseRuntimeConfig) {
  const headers = () => {
    const result = new Headers({ apikey: config.secretKey })
    if (!config.secretKey.startsWith('sb_secret_')) result.set('authorization', `Bearer ${config.secretKey}`)
    return result
  }

  return {
    from(bucket: string) {
      const base = `${config.url}/storage/v1/object`
      return {
        getPublicUrl(path: string) {
          return { data: { publicUrl: `${base}/public/${encodeURIComponent(bucket)}/${storageObjectPath(path)}` } }
        },
        async upload(path: string, body: Uint8Array | ArrayBuffer | string, options?: { contentType?: string; upsert?: boolean }) {
          try {
            const requestHeaders = headers()
            requestHeaders.set('content-type', options?.contentType || 'application/octet-stream')
            requestHeaders.set('x-upsert', options?.upsert ? 'true' : 'false')
            const response = await fetch(`${base}/${encodeURIComponent(bucket)}/${storageObjectPath(path)}`, {
              method: 'POST', headers: requestHeaders, body: body as any,
            })
            if (!response.ok) return { data: null, error: await storageError(response) }
            return { data: { path, fullPath: `${bucket}/${path}` }, error: null }
          } catch (err) {
            return { data: null, error: { message: err instanceof Error ? err.message : 'Upload failed.', details: '', hint: '', code: 'STORAGE_CONNECTION_ERROR' } }
          }
        },
        async download(path: string) {
          try {
            const response = await fetch(`${base}/${encodeURIComponent(bucket)}/${storageObjectPath(path)}`, { headers: headers(), cache: 'no-store' })
            if (!response.ok) return { data: null, error: await storageError(response) }
            return { data: new Blob([await response.arrayBuffer()]), error: null }
          } catch (err) {
            return { data: null, error: { message: err instanceof Error ? err.message : 'Download failed.', details: '', hint: '', code: 'STORAGE_CONNECTION_ERROR' } }
          }
        },
        async remove(paths: string[]) {
          try {
            const requestHeaders = headers()
            requestHeaders.set('content-type', 'application/json')
            const response = await fetch(`${base}/${encodeURIComponent(bucket)}`, {
              method: 'DELETE', headers: requestHeaders, body: JSON.stringify({ prefixes: paths }),
            })
            if (!response.ok) return { data: null, error: await storageError(response) }
            let data: unknown = null
            try { data = await response.json() } catch {}
            return { data, error: null }
          } catch (err) {
            return { data: null, error: { message: err instanceof Error ? err.message : 'Delete failed.', details: '', hint: '', code: 'STORAGE_CONNECTION_ERROR' } }
          }
        },
        async list(prefix: string, options?: { limit?: number; offset?: number }) {
          try {
            const requestHeaders = headers()
            requestHeaders.set('content-type', 'application/json')
            const response = await fetch(`${config.url}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
              method: 'POST', headers: requestHeaders,
              body: JSON.stringify({ prefix, limit: options?.limit ?? 100, offset: options?.offset ?? 0, sortBy: { column: 'created_at', order: 'desc' } }),
            })
            if (!response.ok) return { data: null, error: await storageError(response) }
            return { data: await response.json(), error: null }
          } catch (err) {
            return { data: null, error: { message: err instanceof Error ? err.message : 'List failed.', details: '', hint: '', code: 'STORAGE_CONNECTION_ERROR' } }
          }
        },
      }
    },
  }
}

export function createSupabaseRestClient(config: SupabaseRuntimeConfig) {
  const client: any = {
    from(table: string) { return new SupabaseRestQueryBuilder(config, table) },
    storage: createStorage(config),
    async rpc(functionName: string, args: Record<string, unknown> = {}) {
      if (!IDENTIFIER.test(functionName)) {
        return { data: null, error: { message: 'Invalid function name.', details: '', hint: '', code: 'INVALID_FUNCTION' } }
      }
      try {
        const headers = new Headers({ apikey: config.secretKey, 'content-type': 'application/json' })
        if (!config.secretKey.startsWith('sb_secret_')) headers.set('authorization', `Bearer ${config.secretKey}`)
        const response = await fetch(`${config.url}/rest/v1/rpc/${functionName}`, {
          method: 'POST', headers, body: JSON.stringify(args), cache: 'no-store',
        })
        const raw = response.status === 204 ? '' : await response.text()
        let data: any = null
        if (raw) {
          try { data = JSON.parse(raw) } catch { data = null }
        }
        if (!response.ok) return { data: null, error: errorFromBody(data, `Supabase RPC failed (${response.status}).`) }
        return { data, error: null }
      } catch (err) {
        return {
          data: null,
          error: { message: err instanceof Error ? err.message : 'Supabase RPC failed.', details: '', hint: '', code: 'SUPABASE_CONNECTION_ERROR' },
        }
      }
    },
  }

  client.auth = {
    async signOut() { return { error: null } },
    async signInWithPassword(credentials: { email: string; password: string }) {
      const email = String(credentials.email ?? '').trim().toLowerCase()
      if (!email) return { data: { user: null }, error: { message: 'Invalid login credentials', details: '', hint: '', code: 'invalid_credentials' } }
      const { data, error } = await client.from('admin_users')
        .select('user_id, email, password_hash, active')
        .eq('email', email)
        .maybeSingle()
      if (error || !data || !(data.active === true || data.active === 1)) {
        return { data: { user: null }, error: error ?? { message: 'Invalid login credentials', details: '', hint: '', code: 'invalid_credentials' } }
      }
      const valid = await verifyPassword(credentials.password, String(data.password_hash ?? ''))
      return valid
        ? { data: { user: { id: String(data.user_id), email: String(data.email) } }, error: null }
        : { data: { user: null }, error: { message: 'Invalid login credentials', details: '', hint: '', code: 'invalid_credentials' } }
    },
    admin: {
      async createUser(attributes: { email: string; password: string }) {
        const email = String(attributes.email ?? '').trim().toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return { data: { user: null }, error: { message: 'A valid email address is required.', details: '', hint: '', code: 'validation_failed' } }
        }
        if (typeof attributes.password !== 'string' || attributes.password.length < 12) {
          return { data: { user: null }, error: { message: 'Password must be at least 12 characters long.', details: '', hint: '', code: 'validation_failed' } }
        }
        const { data, error } = await client.from('admin_users').select('user_id').eq('email', email).maybeSingle()
        if (error) return { data: { user: null }, error }
        if (data) return { data: { user: null }, error: { message: 'A user with this email address has already been registered', details: '', hint: '', code: 'user_already_exists' } }
        return { data: { user: { id: randomUUID(), email } }, error: null }
      },
      async deleteUser(id: string) {
        const { error } = await client.from('admin_users').delete().eq('user_id', id)
        return { data: null, error }
      },
      async signOut() { return { error: null } },
      async listUsers(options?: { page?: number; perPage?: number }) {
        const page = Math.max(1, options?.page ?? 1)
        const perPage = Math.max(1, Math.min(1000, options?.perPage ?? 50))
        const { data, error } = await client.from('admin_users').select('user_id, email')
          .order('created_at', { ascending: true }).range((page - 1) * perPage, page * perPage - 1)
        const users = Array.isArray(data) ? data.map((row: any) => ({ id: String(row.user_id), email: row.email ?? null })) : []
        return { data: { users }, error }
      },
    },
  }

  return client
}
