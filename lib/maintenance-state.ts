import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export const DEFAULT_MAINTENANCE_MESSAGE =
  'Our website is temporarily unavailable while we complete scheduled maintenance. Please check back soon.'

export type MaintenanceSnapshot = {
  enabled: boolean
  message: string
}

function snapshotPath() {
  return path.join(process.cwd(), 'data', 'maintenance-settings.json')
}

export function readMaintenanceSnapshot(): MaintenanceSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(snapshotPath(), 'utf8'))
    if (!parsed || typeof parsed !== 'object') return null
    const record = parsed as Record<string, unknown>
    if (typeof record.enabled !== 'boolean' || typeof record.message !== 'string') return null
    const message = record.message.trim()
    if (message.length < 10 || message.length > 500) return null
    return { enabled: record.enabled, message }
  } catch {
    return null
  }
}

export function writeMaintenanceSnapshot(patch: Partial<MaintenanceSnapshot>): MaintenanceSnapshot {
  const existing = readMaintenanceSnapshot() ?? {
    enabled: false,
    message: DEFAULT_MAINTENANCE_MESSAGE,
  }
  const next: MaintenanceSnapshot = {
    enabled: patch.enabled ?? existing.enabled,
    message: patch.message?.trim() || existing.message,
  }
  if (next.message.length < 10 || next.message.length > 500) {
    throw new Error('Maintenance notice must be between 10 and 500 characters.')
  }

  try {
    const filePath = snapshotPath()
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`
    fs.writeFileSync(temporaryPath, JSON.stringify(next), 'utf8')
    try {
      fs.renameSync(temporaryPath, filePath)
    } catch {
      fs.copyFileSync(temporaryPath, filePath)
      try { fs.unlinkSync(temporaryPath) } catch {}
    }
  } catch (err) {
    console.warn('[maintenance-state] Could not write local snapshot to disk:', err)
  }
  return next
}
