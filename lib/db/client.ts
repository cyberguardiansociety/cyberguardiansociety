import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

/**
 * Process-wide SQLite state.
 *
 * Next.js bundles each route/page entry separately, so a plain module-level
 * variable would create one in-memory database per entry — writes made by an
 * API route would be invisible to a page rendered from another bundle.
 * Storing the instance (and the wasm loader) on `globalThis` guarantees a
 * single shared connection for the whole process.
 *
 * `loadedMtimeMs` tracks the on-disk copy so writes performed by another
 * process (for example the Express backend sharing data/cgs.db) are picked up
 * before the next statement runs.
 */
type DbState = {
  SQL: any | null
  db: any | null
  loadedMtimeMs: number
  loading: Promise<any> | null
}

const state: DbState = ((globalThis as any).__cgsSqliteState ??= {
  SQL: null,
  db: null,
  loadedMtimeMs: 0,
  loading: null,
} as DbState)

function dbPath(): string {
  if (process.env.SQLITE_DB_PATH) {
    return path.resolve(process.cwd(), process.env.SQLITE_DB_PATH)
  }
  const rootDb = path.join(process.cwd(), 'cgs.db')
  if (fs.existsSync(rootDb)) {
    return rootDb
  }
  const legacyDataDb = path.join(process.cwd(), 'data', 'cgs.db')
  if (fs.existsSync(legacyDataDb)) {
    return legacyDataDb
  }
  return rootDb
}

function fileMtimeMs(): number {
  try {
    return fs.statSync(dbPath()).mtimeMs
  } catch {
    return 0
  }
}

/**
 * sql.js's emscripten loader locates `sql-wasm.wasm` relative to the current
 * working directory, which breaks inside Next.js build workers (their cwd is
 * not the project root). We resolve the binary explicitly and hand it to the
 * loader so the database works in every runtime (dev server, build workers,
 * production server, and the Express backend).
 */
function loadWasmBinary(): ArrayBuffer {
  try {
    // Resolve the sql.js entry module and read the wasm next to it.
    // `sql.js` is marked serverExternalPackages, so this resolves to the real
    // file on disk at runtime instead of a bundle artifact.
    const requireFn = (typeof require !== 'undefined' ? require : null) as NodeRequire | null
    const entry = requireFn
      ? requireFn.resolve('sql.js')
      : createRequire(path.join(process.cwd(), '__cgs_resolver__.js')).resolve('sql.js')
    const wasmPath = path.join(path.dirname(entry), 'sql-wasm.wasm')
    if (fs.existsSync(/*turbopackIgnore: true*/ wasmPath)) {
      return toArrayBuffer(fs.readFileSync(/*turbopackIgnore: true*/ wasmPath))
    }
  } catch {
    // Fall through to the cwd-based lookup.
  }

  // Last-resort fallback for plain Node scripts run from the project root.
  const fallback = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  return toArrayBuffer(fs.readFileSync(/*turbopackIgnore: true*/ fallback))
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}

async function getSqlModule(): Promise<any> {
  if (!state.SQL) {
    state.SQL = await initSqlJs({ wasmBinary: loadWasmBinary() })
  }
  return state.SQL
}

function readDatabaseFile(): Uint8Array | null {
  try {
    const file = dbPath()
    if (fs.existsSync(file)) {
      return fs.readFileSync(file)
    }
  } catch {
    // Treated as a missing database file.
  }
  return null
}

export async function getDatabase(): Promise<any> {
  if (state.db) return state.db
  if (!state.loading) {
    state.loading = (async () => {
      const SQL = await getSqlModule()
      const dbBuffer = readDatabaseFile()
      const db = new SQL.Database(dbBuffer || undefined)
      // Enable WAL mode for better concurrency
      db.exec('PRAGMA journal_mode = WAL;')
      db.exec('PRAGMA foreign_keys = ON;')
      state.db = db
      state.loadedMtimeMs = fileMtimeMs()
      return db
    })()
  }
  return state.loading
}

/**
 * Reloads the database when another process wrote a newer copy to disk.
 * Safe to call before every statement; a single statSync when nothing changed.
 */
export async function refreshDatabaseIfStale(): Promise<void> {
  if (!state.db) return
  const diskMtime = fileMtimeMs()
  if (diskMtime <= state.loadedMtimeMs) return

  try {
    const SQL = await getSqlModule()
    const buffer = readDatabaseFile()
    if (!buffer) return
    const replacement = new SQL.Database(buffer)
    replacement.exec('PRAGMA foreign_keys = ON;')
    try {
      state.db.close()
    } catch {
      // Ignore close failures on the stale instance.
    }
    state.db = replacement
    state.loadedMtimeMs = diskMtime
  } catch {
    // Keep the current in-memory database if the reload fails.
  }
}

export async function saveDatabase(): Promise<void> {
  if (!state.db) return

  // Never write the database file from Next.js build workers: several
  // prerender workers would each rewrite data/cgs.db concurrently and
  // clobber each other. The database is (re)written at runtime instead.
  if (process.env.NEXT_PHASE === 'phase-production-build') return

  const target = dbPath()
  const dataDir = path.dirname(target)

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const data = Buffer.from(state.db.export())

  // Write atomically so a concurrent reader never observes a partial file.
  const temp = `${target}.tmp`
  try {
    fs.writeFileSync(temp, data)
    fs.renameSync(temp, target)
  } catch {
    try {
      fs.rmSync(temp, { force: true })
    } catch {
      // Ignore cleanup failures.
    }
    fs.writeFileSync(target, data)
  }

  state.loadedMtimeMs = fileMtimeMs()
}

export async function closeDatabase(): Promise<void> {
  if (state.db) {
    await saveDatabase()
    state.db.close()
    state.db = null
    state.loadedMtimeMs = 0
    state.loading = null
  }
}
