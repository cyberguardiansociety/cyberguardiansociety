import fs from 'node:fs'
import path from 'node:path'
import initSqlJs from 'sql.js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || ''

async function main() {
  const SQL = await initSqlJs({
    locateFile: (f) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', f)
  })
  const dbFile = fs.existsSync('cgs.db') ? 'cgs.db' : 'data/cgs.db'
  const db = new SQL.Database(fs.readFileSync(dbFile))
  const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  const tables = res[0].values.flat()

  console.log(`Inspecting database: ${dbFile}`)
  console.log('TABLE COUNTS COMPARISON (SQLite vs Supabase):')
  console.log('='.repeat(60))

  for (const t of tables) {
    const sqliteCount = db.exec(`SELECT count(*) FROM "${t}"`)[0].values[0][0]
    
    let supabaseCount = 'N/A'
    try {
      const resp = await fetch(`${supabaseUrl}/rest/v1/${t}?select=count`, {
        headers: {
          apikey: supabaseSecret,
          authorization: `Bearer ${supabaseSecret}`,
          Prefer: 'count=exact'
        }
      })
      if (resp.ok) {
        const cr = resp.headers.get('content-range')
        if (cr) {
          supabaseCount = cr.split('/')[1] || '0'
        } else {
          const data = await resp.json()
          supabaseCount = data[0]?.count ?? '?'
        }
      } else {
        supabaseCount = `Err ${resp.status}`
      }
    } catch (e) {
      supabaseCount = `Error: ${e.message}`
    }

    console.log(`${t.padEnd(30)} SQLite: ${String(sqliteCount).padStart(5)} | Supabase: ${String(supabaseCount).padStart(5)}`)
  }
}

main().catch(console.error)
