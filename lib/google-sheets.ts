import 'server-only'

import { google } from 'googleapis'
import type { createSupabaseServerClient } from '@/lib/supabase/server'

export type PortalSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

const DEFAULT_SERVICE_ACCOUNT_EMAIL = 'cyberguardiansociety@gen-lang-client-0696792386.iam.gserviceaccount.com'

export function googleSheetsConfigured() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || DEFAULT_SERVICE_ACCOUNT_EMAIL
  return Boolean(email && process.env.GOOGLE_PRIVATE_KEY)
}

function createGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || DEFAULT_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !privateKey) return null
  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function boundedCell(row: unknown[], index: number, maxLength: number) {
  const value = row[index]
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export type SyncSummary = {
  rowsRead: number
  registrantsCreated: number
  registrationsCreated: number
  registrationsExisting: number
  duplicates: number
  invalid: number
}

export async function syncGoogleConnection(
  supabase: PortalSupabaseClient,
  connectionId: string,
): Promise<SyncSummary> {
  const auth = createGoogleAuth()
  if (!auth) throw new Error('Google Sheets credentials are not configured.')

  const { data: connection, error: connectionError } = await supabase
    .from('cgs_google_sheet_connections')
    .select('id, spreadsheet_id, sheet_name, is_active')
    .eq('id', connectionId)
    .maybeSingle()
  if (connectionError || !connection) throw new Error('Google Sheets connection was not found.')
  if (!connection.is_active) throw new Error('This Google Sheets connection is disabled.')

  const { data: linkedSessions, error: sessionError } = await supabase
    .from('online_sessions')
    .select('id')
    .eq('sheet_connection_id', connectionId)
    .eq('is_active', true)
  if (sessionError) throw new Error('Could not load sessions linked to this sheet.')

  let sessionIds = (linkedSessions ?? []).map((session) => session.id as string)
  if (!sessionIds.length) {
    const { data: activeSessions, error } = await supabase
      .from('online_sessions')
      .select('id')
      .eq('is_active', true)
    if (error) throw new Error('Could not load active sessions for registration sync.')
    sessionIds = (activeSessions ?? []).map((session) => session.id as string)
  }
  if (!sessionIds.length) throw new Error('Create or link an active session before syncing registrants.')

  const { data: run, error: runError } = await supabase
    .from('cgs_google_sync_runs')
    .insert({ connection_id: connectionId, status: 'running' })
    .select('id')
    .single()
  if (runError || !run) throw new Error('Could not start the sync run.')

  const summary: SyncSummary = {
    rowsRead: 0,
    registrantsCreated: 0,
    registrationsCreated: 0,
    registrationsExisting: 0,
    duplicates: 0,
    invalid: 0,
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth })
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: connection.spreadsheet_id,
      range: connection.sheet_name,
    })
    const rows = response.data.values ?? []
    if (rows.length < 2) throw new Error('The sheet needs a header row and at least one data row.')

    const header = rows[0].map((value) => String(value ?? '').toLowerCase().trim())
    const emailIndex = header.findIndex((value) => /email/i.test(value))
    let nameIndex = header.findIndex((value) => /full\s*name/i.test(value))
    if (nameIndex < 0) {
      nameIndex = header.findIndex((value) => /(participant|student|attendee|registrant|your)\s*name/i.test(value))
    }
    if (nameIndex < 0) {
      nameIndex = header.findIndex((value) => /name/i.test(value) && !/email|user|file|sheet|status|type/i.test(value))
    }
    const firstNameIndex = header.findIndex((value) => /first\s*name/i.test(value))
    const lastNameIndex = header.findIndex((value) => /last\s*name|surname/i.test(value))

    const phoneIndex = header.findIndex((value) => /(whatsapp|phone|contact|mobile|cell|number)/i.test(value))
    const organizationIndex = header.findIndex((value) => /(organization|organisation|university|institute|college|company|affiliation|school)/i.test(value))
    const locationIndex = header.findIndex((value) => /(city|country|location|address)/i.test(value))
    const experienceIndex = header.findIndex((value) => /(experience|level|skill|background)/i.test(value))
    if (emailIndex < 0) throw new Error('No email column was found in the sheet header.')

    summary.rowsRead = rows.length - 1
    const uniqueRows = new Map<string, {
      email: string
      name: string
      whatsapp: string
      organization: string
      countryCity: string
      experienceLevel: string
    }>()
    for (const rowValue of rows.slice(1)) {
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
      const { data, error } = await supabase.from('cgs_registrants')
        .select('id, email, name, whatsapp, organization, country_city, experience_level')
        .in('email', emails)
      if (error) throw new Error('Could not check existing registrants.')
      for (const item of data ?? []) existingByEmail.set(item.email as string, item as Record<string, unknown>)
    }

    const registrarRows = registrants.map((row) => {
      const old = existingByEmail.get(row.email)
      if (old) summary.registrantsCreated += 0
      else summary.registrantsCreated += 1
      return {
        email: row.email,
        name: row.name?.trim() || (old?.name as string)?.trim() || null,
        whatsapp: row.whatsapp?.trim() || (old?.whatsapp as string)?.trim() || null,
        organization: row.organization?.trim() || (old?.organization as string)?.trim() || null,
        country_city: row.countryCity?.trim() || (old?.country_city as string)?.trim() || null,
        experience_level: row.experienceLevel?.trim() || (old?.experience_level as string)?.trim() || null,
        updated_at: new Date().toISOString(),
      }
    })

    const registrantByEmail = new Map<string, { id: string; email: string }>()
    for (let offset = 0; offset < registrarRows.length; offset += 100) {
      const { data, error } = await supabase.from('cgs_registrants')
        .upsert(registrarRows.slice(offset, offset + 100), { onConflict: 'email' })
        .select('id, email')
      if (error) throw new Error('Could not save registrants from the sheet.')
      for (const item of data ?? []) registrantByEmail.set(item.email as string, item as { id: string; email: string })
    }

    const registrationPairs = registrants.flatMap((row) => {
      const registrant = registrantByEmail.get(row.email)
      return registrant ? sessionIds.map((sessionId) => ({ registrant_id: registrant.id, session_id: sessionId })) : []
    })
    const registrantIds = [...new Set(registrationPairs.map((item) => item.registrant_id))]
    const existingPairs = new Set<string>()
    for (let offset = 0; offset < registrantIds.length; offset += 100) {
      const ids = registrantIds.slice(offset, offset + 100)
      const { data, error } = await supabase.from('cgs_session_registrations')
        .select('registrant_id, session_id')
        .in('registrant_id', ids)
        .in('session_id', sessionIds)
      if (error) throw new Error('Could not check existing session registrations.')
      for (const item of data ?? []) existingPairs.add(`${item.registrant_id}:${item.session_id}`)
    }

    const newRegistrations = registrationPairs.filter((item) => !existingPairs.has(`${item.registrant_id}:${item.session_id}`))
    summary.registrationsCreated = newRegistrations.length
    summary.registrationsExisting = registrationPairs.length - newRegistrations.length
    for (let offset = 0; offset < newRegistrations.length; offset += 500) {
      const { error } = await supabase.from('cgs_session_registrations')
        .insert(newRegistrations.slice(offset, offset + 500).map((item) => ({ ...item, source: 'google-sheets' })))
      if (error) throw new Error('Could not save session registrations from the sheet.')
    }

    const { error: finishError } = await supabase.from('cgs_google_sync_runs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      rows_read: summary.rowsRead,
      created_count: summary.registrationsCreated,
      updated_count: summary.registrationsExisting,
      duplicate_count: summary.duplicates,
      invalid_count: summary.invalid,
      details: { registrantsCreated: summary.registrantsCreated },
    }).eq('id', run.id)
    if (finishError) throw new Error('The sync completed but its result could not be recorded.')

    await supabase.from('cgs_google_sheet_connections').update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', connectionId)
    return summary
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'Unknown sync error.'
    await supabase.from('cgs_google_sync_runs').update({
      status: 'error',
      finished_at: new Date().toISOString(),
      rows_read: summary.rowsRead,
      created_count: summary.registrationsCreated,
      updated_count: summary.registrationsExisting,
      duplicate_count: summary.duplicates,
      invalid_count: summary.invalid,
      error_message: message,
    }).eq('id', run.id)
    throw new Error(message)
  }
}
