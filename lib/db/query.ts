import { getDatabase, refreshDatabaseIfStale, saveDatabase } from './client'

export type QueryResult<T = any> = {
  success: boolean
  data?: T[]
  error?: string
  rowsAffected?: number
}

export async function query<T = any>(
  sql: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  try {
    await refreshDatabaseIfStale()
    const db = await getDatabase()
    const stmt = db.prepare(sql)

    const results: T[] = []
    try {
      stmt.bind(params)
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T)
      }
    } finally {
      stmt.free()
    }

    return {
      success: true,
      data: results,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function run(
  sql: string,
  params: any[] = []
): Promise<QueryResult> {
  try {
    await refreshDatabaseIfStale()
    const db = await getDatabase()
    const stmt = db.prepare(sql)
    stmt.run(params)
    stmt.free()

    await saveDatabase()

    return {
      success: true,
      rowsAffected: db.getRowsModified(),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function insert<T = any>(
  table: string,
  data: Record<string, any>
): Promise<QueryResult<T>> {
  const columns = Object.keys(data)
  const placeholders = columns.map(() => '?').join(', ')
  const values = Object.values(data)

  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`

  const result = await run(sql, values)

  if (!result.success) return result

  // Get the inserted row using LAST_INSERT_ROWID()
  const selectResult = await query<T>(
    `SELECT * FROM ${table} WHERE rowid = LAST_INSERT_ROWID()`
  )

  return selectResult
}

export async function update<T = any>(
  table: string,
  data: Record<string, any>,
  where: string,
  whereParams: any[] = []
): Promise<QueryResult<T>> {
  const columns = Object.keys(data)
  const setClause = columns.map((col) => `${col} = ?`).join(', ')
  const values = [...Object.values(data), ...whereParams]

  const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`

  const result = await run(sql, values)

  if (!result.success) return result

  // For simplicity, return success without updated data
  return {
    success: true,
    rowsAffected: result.rowsAffected,
  }
}

export async function deleteRow(
  table: string,
  where: string,
  whereParams: any[] = []
): Promise<QueryResult> {
  const sql = `DELETE FROM ${table} WHERE ${where}`

  return run(sql, whereParams)
}

export async function select<T = any>(
  table: string,
  where?: string,
  whereParams: any[] = [],
  orderBy?: string,
  limit?: number
): Promise<QueryResult<T>> {
  let sql = `SELECT * FROM ${table}`

  if (where) {
    sql += ` WHERE ${where}`
  }

  if (orderBy) {
    sql += ` ORDER BY ${orderBy}`
  }

  if (limit) {
    sql += ` LIMIT ${limit}`
  }

  return query<T>(sql, whereParams)
}

export async function selectOne<T = any>(
  table: string,
  where: string,
  whereParams: any[] = []
): Promise<QueryResult<T>> {
  const result = await select<T>(table, where, whereParams)

  return {
    ...result,
    data: result.data?.[0] ? [result.data[0]] : undefined,
  }
}

export async function count(
  table: string,
  where?: string,
  whereParams: any[] = []
): Promise<QueryResult<{ count: number }>> {
  let sql = `SELECT COUNT(*) as count FROM ${table}`

  if (where) {
    sql += ` WHERE ${where}`
  }

  return query<{ count: number }>(sql, whereParams)
}
