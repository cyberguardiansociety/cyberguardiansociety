import 'server-only'

import { google } from 'googleapis'
import type { createSupabaseServerClient } from '@/lib/supabase/server'

export type PortalSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export const DEFAULT_SERVICE_ACCOUNT_EMAIL =
  'cyberguardiansociety@gen-lang-client-0696792386.iam.gserviceaccount.com'

export const DEFAULT_SERVICE_ACCOUNT_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDMGEu5bQgHjgoZ
t8ilT85vv11lqXOoRNlQAm+bT5fIypm5ExIY7sHS0TtQvdciXs9+DbxIgG+izDoI
rZCNb8sCAT9i4vlcProYY8bfNe6GnC3LIG5GLSFJRGfpD86PjxV2B/5BUQNWlrYs
D8rbohWwin+3pWe28+jtSTMv8+Zkf6xdcLq8kUoZZCWi+aBxVyKTE1cBqXNR5OsT
aVoTpIa//i1SG20WAmEict9ZDdCVaO9jOivZRDRdkTbXuvOUcMxxLdizxgz7r+kk
VPB6RXYFZoBbMHVT+UJIowXBtr/Uz+a95D4Tud0pRarMA+TRpm/fQe824rFccrl5
Tg8f1HMZAgMBAAECggEAEdIrRoklMtetvRolnH2v9mT8yEQ4E6DTYt+blDGqfL9o
Fdd69I9ggEKBzeaNsvQZZRXY83G3jb0McjaJkTgKP2YRfVZ5VJsrj7aiplnktn9L
pllyF5GYPvgIpLqbHEDvrEs9YcGrq3Nke8tzOKNaBnzJcyUvvbNlitah8BV5cBvn
6jxXGxbFsyceRGcX43y3UCnA2KUvCZCG6ls2GXdhGh/4E5CIG+mD4HwYxZE1pPk5
DR22bDFoM8GM9Uc2TzzHj5B3xZdMGFWcZQOrpJZwiL2YKfimFUSCKDhv69NT5k9/
KHzlINNUiQQxqq5vIIyq9VYoRXcu7hxBN4ji+yvTKQKBgQDoKtaXA4dBsJs1fgPp
eh04lqQ6E3WOBExBFGFlVcpz8PIvKj6wDkZ3uaAybakQ0/sEkMPFt9gvu0L79btj
haBKYdt9iRihX28ES8Xq7IUUzQEl5RRzDnuKjf38e/zXtu11cD4T+qQnTCNX7eOR
P/F3Gx2Rxdxmae6yL+QZ1Oln9QKBgQDhC7zcjS5plB6cSVBWEIq865aMDvhjmm1Q
6QmuKcFanAAPzWyZwjWOuu++AE7uUTc/yEuybnbkwKW+7YhQ2T1QdHfDMmniLSph
spj35dUWQfD0kqi+s7GAq+wjI+UWxRa9cbQjn7JE6b1B8Nf5mz6q+HpGa2PRQMuA
X5Nns5u8FQKBgQCuN+899VTbM4bU9lJDMvKYk1p7hjyxrIH4WC3aGC3LISTrxbyy
6pNwpmgTT30N9rSoMWXnidT9xH04i6bpwM2O464MnwNPnUi2pZHIf2JCQLA62pOk
31pPl8vfWr9atJeuh+LdpTjnkFf5VLdvONee9EcVK6//XkDTj+KQi9f2vQKBgQDg
TBmdXJ1gnz9vF2cZkH0m1EwFJjqM03KWzN1YF8fd7lPlbCIMkdNdgZXHMnl477t4
N8KygYTAc/3+cLKHmi2RTbO7+jgsNEXkf+QUV57tAyYMLUxAXcrRawj88R64dhE3
GeeoBdfg9XIrEcfAwOlR8Du2ifw/qCvrs9av6gSTDQKBgQC6N+/z923THOJMpDMm
DnNw/U4Q3+jrz4gGeChvpBPO5A6p9z73X92hg5C3TppspLFKk0bJ8SjOQAI1T7Jm
LpT5AXwcQL1PRyql0TgakY2yadL1FUY/HwHDSHqShH1cHW+qIHd/uXjMJiuYf5uC
i1W8P7fB6WTshiwnPZ1wHkfDJw==
-----END PRIVATE KEY-----`

export function getGooglePrivateKey(): string {
  const envKey = process.env.GOOGLE_PRIVATE_KEY
  if (envKey && envKey.trim().length > 20) {
    return envKey.trim()
  }
  return DEFAULT_SERVICE_ACCOUNT_KEY
}

export function googleSheetsConfigured(): boolean {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || DEFAULT_SERVICE_ACCOUNT_EMAIL
  const key = getGooglePrivateKey()
  return Boolean(email && key && key.trim().length > 20)
}

/**
 * Returns a descriptive error string when credentials are incomplete, or null
 * when everything looks fine. Used by the sync function and UI to surface actionable
 * messages instead of opaque failures.
 */
export function googleSheetsCredentialError(): string | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || DEFAULT_SERVICE_ACCOUNT_EMAIL
  const privateKey = getGooglePrivateKey()
  if (!email && !privateKey) {
    return 'Neither GOOGLE_SERVICE_ACCOUNT_EMAIL nor GOOGLE_PRIVATE_KEY is configured.'
  }
  if (!privateKey) {
    return 'Google service-account private key is not configured.'
  }
  if (!email) {
    return 'GOOGLE_SERVICE_ACCOUNT_EMAIL is not set and the default is empty.'
  }
  return null
}

type GoogleJwtAuth = InstanceType<typeof google.auth.JWT>

function createGoogleAuth(): GoogleJwtAuth | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || DEFAULT_SERVICE_ACCOUNT_EMAIL
  let rawKey = getGooglePrivateKey()
  if (!email || !rawKey) return null

  rawKey = rawKey.trim()
  if (
    (rawKey.startsWith('"') && rawKey.endsWith('"')) ||
    (rawKey.startsWith("'") && rawKey.endsWith("'"))
  ) {
    rawKey = rawKey.slice(1, -1)
  }

  // Support keys pasted as a single line with literal \n escapes, as well as
  // keys that contain real newlines (e.g. from a multi-line .env parser).
  const privateKey = rawKey.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n')

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function sanitizeSpreadsheetCell(value: unknown): string | null {
  if (value == null) return null
  const str = String(value).trim()
  if (!str) return null
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`
  }
  return str
}

function boundedCell(row: unknown[], index: number, maxLength: number): string {
  if (index < 0 || index >= row.length) return ''
  const value = row[index]
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function formatSheetRange(sheetName: string): string {
  const trimmed = sheetName.trim()
  if (!trimmed) return 'Sheet1'
  if (trimmed.includes('!') || trimmed.startsWith("'")) return trimmed
  return trimmed.includes(' ') ? `'${trimmed}'` : trimmed
}

/**
 * Parses RFC 4180 CSV strings into a 2D string matrix.
 * Handles quoted fields containing commas, line breaks, and escaped quotes.
 */
function parseCsv(csvText: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentCell += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentCell.trim())
        currentCell = ''
      } else if (char === '\r') {
        // Skip carriage return
      } else if (char === '\n') {
        currentRow.push(currentCell.trim())
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow)
        }
        currentRow = []
        currentCell = ''
      } else {
        currentCell += char
      }
    }
  }
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow)
    }
  }
  return rows
}

/**
 * Fallback to fetch public Google Sheets if the spreadsheet is shared as
 * "Anyone with the link can view". Uses exact sheet name (never gid=0).
 */
async function fetchPublicSheetCsv(spreadsheetId: string, sheetName: string): Promise<string[][] | null> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CyberGuardianSociety/1.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    const text = await res.text()
    if (contentType.includes('text/html') || text.includes('<!DOCTYPE html>') || text.includes('<html')) {
      return null
    }
    const parsed = parseCsv(text)
    if (parsed.length >= 2) return parsed
  } catch (err) {
    console.warn(`[Google Sheets Sync] Public CSV fetch attempt failed for ${url}:`, err)
  }
  return null
}

export type SyncSummary = {
  rowsRead: number
  registrantsCreated: number
  registrationsCreated: number
  registrationsExisting: number
  duplicates: number
  invalid: number
}

const MAX_SYNC_ROWS = 5000

export async function syncGoogleConnection(
  supabase: PortalSupabaseClient,
  connectionId: string,
): Promise<SyncSummary> {
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || DEFAULT_SERVICE_ACCOUNT_EMAIL

  // 1. Fetch connection details
  const { data: connection, error: connectionError } = await supabase
    .from('cgs_google_sheet_connections')
    .select('id, name, spreadsheet_id, sheet_name, is_active')
    .eq('id', connectionId)
    .maybeSingle()
  if (connectionError || !connection) {
    throw new Error('Google Sheets connection was not found in database.')
  }
  if (!connection.is_active) {
    throw new Error('This Google Sheets connection is paused. Resume it to sync.')
  }

  if (!/^[A-Za-z0-9_-]+$/.test(connection.spreadsheet_id)) {
    throw new Error('Invalid Google Spreadsheet ID. It must contain only letters, numbers, hyphens, and underscores.')
  }

  // 2. Fetch linked sessions only (do NOT register to all sessions if unlinked)
  const { data: linkedSessions, error: sessionError } = await supabase
    .from('online_sessions')
    .select('id')
    .eq('sheet_connection_id', connectionId)
    .eq('is_active', true)
  if (sessionError) {
    throw new Error('Could not load sessions linked to this sheet.')
  }

  const sessionIds = (linkedSessions ?? []).map((session) => session.id as string)
  if (!sessionIds.length) {
    throw new Error(
      'No online session is currently linked to this Google Sheet connection. Please link a session in Session Management before syncing.',
    )
  }

  // 3. Create sync run record immediately so audit history always records this run
  const runId = crypto.randomUUID()
  const startedAt = new Date().toISOString()
  const summary: SyncSummary = {
    rowsRead: 0,
    registrantsCreated: 0,
    registrationsCreated: 0,
    registrationsExisting: 0,
    duplicates: 0,
    invalid: 0,
  }

  const { error: runError } = await supabase
    .from('cgs_google_sync_runs')
    .insert({
      id: runId,
      connection_id: connectionId,
      status: 'running',
      started_at: startedAt,
      rows_read: 0,
      created_count: 0,
      updated_count: 0,
      duplicate_count: 0,
      invalid_count: 0,
    })
  if (runError) {
    console.warn('[Google Sheets Sync] Could not initialize run record:', runError)
  }

  try {
    let rows: unknown[][] = []
    let fetchError: Error | null = null

    // 4. Try Google Sheets API v4 using Service Account JWT
    const auth = createGoogleAuth()
    if (auth) {
      try {
        const sheets = google.sheets({ version: 'v4', auth })
        const range = formatSheetRange(connection.sheet_name || 'Sheet1')
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: connection.spreadsheet_id,
          range,
        })
        rows = (response.data.values ?? []) as unknown[][]
      } catch (err: any) {
        fetchError = err instanceof Error ? err : new Error(String(err))
        console.warn('[Google Sheets Sync] Service account API fetch failed, trying public CSV fallback:', err?.message)
      }
    } else {
      fetchError = new Error(
        googleSheetsCredentialError() || 'Google service account private key is not configured.'
      )
    }

    // 5. If API was unavailable or errored, try public CSV fallback
    if (!rows.length) {
      const publicRows = await fetchPublicSheetCsv(connection.spreadsheet_id, connection.sheet_name)
      if (publicRows && publicRows.length > 0) {
        rows = publicRows
        fetchError = null
      }
    }

    // If still no rows, throw actionable diagnostic error
    if (!rows.length) {
      if (fetchError) {
        const gaxios = fetchError as any
        const gMsg = gaxios.response?.data?.error?.message || gaxios.errors?.[0]?.message || fetchError.message
        const status = gaxios.response?.status

        if (status === 403 || /caller does not have permission|permission denied/i.test(gMsg)) {
          throw new Error(
            `Google Sheets access denied (403): The spreadsheet is not shared with "${serviceEmail}". Open your Google Sheet, click Share, add this email as Viewer, OR set General access to "Anyone with the link can view".`
          )
        }
        if (status === 404 || /not found/i.test(gMsg)) {
          throw new Error(
            `Spreadsheet not found (404): Check the Spreadsheet ID ("${connection.spreadsheet_id}").`
          )
        }
        if (!auth) {
          throw new Error(
            `Authentication required: GOOGLE_PRIVATE_KEY is missing in .env.local. Either add your service-account private key to .env.local, OR in Google Sheets click Share > General access > set to "Anyone with the link can view".`
          )
        }
        throw new Error(`Google API: ${gMsg}`)
      }
      throw new Error('The spreadsheet returned no rows. Confirm the sheet tab name and data.')
    }

    if (rows.length < 2) {
      throw new Error('The sheet needs a header row and at least one data row.')
    }

    // 6. Header Column Index Detection
    const header = rows[0].map((value) => String(value ?? '').toLowerCase().trim())
    const emailIndex = header.findIndex((value) => /email/i.test(value))
    let nameIndex = header.findIndex((value) => /full\s*name/i.test(value))
    if (nameIndex < 0) {
      nameIndex = header.findIndex((value) => /(participant|student|attendee|registrant|your)\s*name/i.test(value))
    }
    if (nameIndex < 0) {
      nameIndex = header.findIndex(
        (value) =>
          /name/i.test(value) &&
          !/email|user|file|sheet|status|type|company|father|college|organization|organisation|school|university|institute|dept|department/i.test(
            value,
          ),
      )
    }
    const firstNameIndex = header.findIndex((value) => /first\s*name/i.test(value))
    const lastNameIndex = header.findIndex((value) => /last\s*name|surname/i.test(value))

    // Guard phone matching against serial number / roll number / ticket number / email
    const phoneIndex = header.findIndex(
      (value) =>
        /(whatsapp|phone|contact|mobile|cell)/i.test(value) &&
        !/serial|roll|reg|ticket|token|email|mail/i.test(value),
    )
    const organizationIndex = header.findIndex(
      (value) =>
        /(organization|organisation|university|institute|college|company|affiliation|school|dept|department)/i.test(
          value,
        ) && !/email|mail/i.test(value),
    )
    // Guard location matching against email address
    const locationIndex = header.findIndex(
      (value) => /(city|country|location|address)/i.test(value) && !/email|mail|ip/i.test(value),
    )
    const experienceIndex = header.findIndex((value) => /(experience|level|skill|background)/i.test(value))

    if (emailIndex < 0) {
      throw new Error(
        'No "Email" column was found in the sheet header row. Check that your Google Form responses include an Email column.',
      )
    }

    const dataRows = rows.slice(1, MAX_SYNC_ROWS + 1)
    summary.rowsRead = dataRows.length
    const uniqueRows = new Map<
      string,
      {
        email: string
        name: string
        whatsapp: string
        organization: string
        countryCity: string
        experienceLevel: string
      }
    >()

    for (const rowValue of dataRows) {
      const row = Array.isArray(rowValue) ? rowValue : []
      const email = normalizeEmail(row[emailIndex])
      if (!email) {
        summary.invalid += 1
        continue
      }
      if (uniqueRows.has(email)) {
        summary.duplicates += 1
        continue
      }

      let parsedName = ''
      if (nameIndex >= 0) {
        parsedName = boundedCell(row, nameIndex, 200)
      }
      if (!parsedName && firstNameIndex >= 0) {
        const first = boundedCell(row, firstNameIndex, 100)
        const last = lastNameIndex >= 0 ? boundedCell(row, lastNameIndex, 100) : ''
        parsedName = `${first} ${last}`.trim()
      }

      uniqueRows.set(email, {
        email,
        name: parsedName,
        whatsapp: boundedCell(row, phoneIndex, 50),
        organization: boundedCell(row, organizationIndex, 200),
        countryCity: boundedCell(row, locationIndex, 100),
        experienceLevel: boundedCell(row, experienceIndex, 100),
      })
    }

    const registrants = [...uniqueRows.values()]
    const existingByEmail = new Map<string, Record<string, unknown>>()

    for (let offset = 0; offset < registrants.length; offset += 100) {
      const emails = registrants.slice(offset, offset + 100).map((row) => row.email)
      if (!emails.length) continue
      const { data, error } = await supabase
        .from('cgs_registrants')
        .select('id, email, name, whatsapp, organization, country_city, experience_level')
        .in('email', emails)
      if (error) throw new Error('Could not check existing registrants.')
      for (const item of data ?? []) {
        existingByEmail.set(item.email as string, item as Record<string, unknown>)
      }
    }

    const registrarRows = registrants.map((row) => {
      const old = existingByEmail.get(row.email)
      if (!old) summary.registrantsCreated += 1

      // Item 13: Anyone submitting with someone else's email cannot overwrite their existing data
      const oldName = typeof old?.name === 'string' ? old.name.trim() : ''
      const oldWhatsapp = typeof old?.whatsapp === 'string' ? old.whatsapp.trim() : ''
      const oldOrg = typeof old?.organization === 'string' ? old.organization.trim() : ''
      const oldLocation = typeof old?.country_city === 'string' ? old.country_city.trim() : ''
      const oldExperience = typeof old?.experience_level === 'string' ? old.experience_level.trim() : ''

      const derivedName =
        oldName ||
        row.name?.trim() ||
        row.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

      return {
        id: (old?.id as string) || crypto.randomUUID(),
        email: row.email,
        name: sanitizeSpreadsheetCell(derivedName || 'Participant')!,
        whatsapp: sanitizeSpreadsheetCell(oldWhatsapp || row.whatsapp?.trim() || null),
        organization: sanitizeSpreadsheetCell(oldOrg || row.organization?.trim() || null),
        country_city: sanitizeSpreadsheetCell(oldLocation || row.countryCity?.trim() || null),
        experience_level: sanitizeSpreadsheetCell(oldExperience || row.experienceLevel?.trim() || null),
        updated_at: new Date().toISOString(),
      }
    })

    const registrantByEmail = new Map<string, { id: string; email: string }>()
    for (let offset = 0; offset < registrarRows.length; offset += 100) {
      const { data, error } = await supabase
        .from('cgs_registrants')
        .upsert(registrarRows.slice(offset, offset + 100), { onConflict: 'email' })
        .select('id, email')
      if (error) throw new Error('Could not save registrants from the sheet.')
      for (const item of data ?? []) {
        registrantByEmail.set(item.email as string, item as { id: string; email: string })
      }
    }

    // 7. Associate registrants with sessions
    const registrationPairs = registrants.flatMap((row) => {
      const registrant = registrantByEmail.get(row.email)
      return registrant ? sessionIds.map((sessionId) => ({ registrant_id: registrant.id, session_id: sessionId })) : []
    })

    const registrantIds = [...new Set(registrationPairs.map((item) => item.registrant_id))]
    const existingPairs = new Set<string>()

    for (let offset = 0; offset < registrantIds.length; offset += 100) {
      const ids = registrantIds.slice(offset, offset + 100)
      const { data, error } = await supabase
        .from('cgs_session_registrations')
        .select('registrant_id, session_id')
        .in('registrant_id', ids)
        .in('session_id', sessionIds)
      if (error) throw new Error('Could not check existing session registrations.')
      for (const item of data ?? []) {
        existingPairs.add(`${item.registrant_id}:${item.session_id}`)
      }
    }

    const newRegistrations = registrationPairs.filter(
      (item) => !existingPairs.has(`${item.registrant_id}:${item.session_id}`),
    )
    summary.registrationsCreated = newRegistrations.length
    summary.registrationsExisting = registrationPairs.length - newRegistrations.length

    for (let offset = 0; offset < newRegistrations.length; offset += 500) {
      const { error } = await supabase
        .from('cgs_session_registrations')
        .upsert(
          newRegistrations.slice(offset, offset + 500).map((item) => ({
            id: crypto.randomUUID(),
            ...item,
            source: 'google-sheets',
          })),
          { onConflict: 'registrant_id,session_id', ignoreDuplicates: true },
        )
      if (error) throw new Error('Could not save session registrations from the sheet.')
    }

    // 8. Record success in sync run log
    const finishedAt = new Date().toISOString()
    await supabase
      .from('cgs_google_sync_runs')
      .update({
        status: 'success',
        finished_at: finishedAt,
        rows_read: summary.rowsRead,
        created_count: summary.registrationsCreated,
        updated_count: summary.registrationsExisting,
        duplicate_count: summary.duplicates,
        invalid_count: summary.invalid,
        details: { registrantsCreated: summary.registrantsCreated },
        error_message: null,
      })
      .eq('id', runId)

    await supabase
      .from('cgs_google_sheet_connections')
      .update({
        last_synced_at: finishedAt,
        updated_at: finishedAt,
      })
      .eq('id', connectionId)

    return summary
  } catch (error: unknown) {
    let message = 'Unknown sync error.'
    if (error instanceof Error) {
      message = error.message
      const gaxios = error as any
      if (gaxios.response?.data?.error?.message) {
        message = `Google API: ${gaxios.response.data.error.message}`
      } else if (gaxios.errors?.[0]?.message) {
        message = `Google API: ${gaxios.errors[0].message}`
      }
    }
    message = message.slice(0, 500)
    console.error('[Google Sheets Sync] Failed:', message)

    try {
      await supabase
        .from('cgs_google_sync_runs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          rows_read: summary.rowsRead,
          created_count: summary.registrationsCreated,
          updated_count: summary.registrationsExisting,
          duplicate_count: summary.duplicates,
          invalid_count: summary.invalid,
          error_message: message,
        })
        .eq('id', runId)
    } catch (dbErr) {
      console.error('[Google Sheets Sync] Could not record error in sync run log:', dbErr)
    }

    throw new Error(message)
  }
}
