import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { isSupabaseRuntimeConfigured } from '@/lib/supabase/config'
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  readMaintenanceSnapshot,
  writeMaintenanceSnapshot,
} from '@/lib/maintenance-state'

export { DEFAULT_MAINTENANCE_MESSAGE } from '@/lib/maintenance-state'

export const PORTAL_SETTING_DEFAULTS = {
  portal_open: true,
  attendance_open: true,
  join_cgs_coming_soon: false,
  speaker_coming_soon: false,
  products_coming_soon: false,
  resources_coming_soon: false,
  maintenance_mode: false,
} as const

export type PortalSettingKey = keyof typeof PORTAL_SETTING_DEFAULTS
export type PortalSettings = Record<PortalSettingKey, boolean>
export type MaintenanceSettings = { enabled: boolean; message: string }

function parseSetting(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === 'true') return true
  if (value === false || value === 0 || value === 'false') return false
  return fallback
}

async function getStoredPortalSettings(): Promise<Map<string, unknown>> {
  try {
    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase.from('cgs_portal_settings').select('key, value')
    if (error) {
      console.warn('[portal-settings] Failed to load portal settings from database:', error.message)
      return new Map<string, unknown>()
    }

    const stored = new Map<string, unknown>()
    for (const row of (Array.isArray(data) ? data : [])) {
      if (typeof row.key === 'string') stored.set(row.key, row.value)
    }
    return stored
  } catch (err) {
    console.warn('[portal-settings] Exception reading settings:', err)
    return new Map<string, unknown>()
  }
}

export async function getPortalSettings(): Promise<PortalSettings> {
  try {
    const stored = await getStoredPortalSettings()
    const settings = Object.fromEntries(
      Object.entries(PORTAL_SETTING_DEFAULTS).map(([key, fallback]) => [
        key,
        parseSetting(stored.get(key), fallback),
      ]),
    ) as PortalSettings
    const maintenanceSnapshot = isSupabaseRuntimeConfigured() ? null : readMaintenanceSnapshot()
    if (maintenanceSnapshot) settings.maintenance_mode = maintenanceSnapshot.enabled
    return settings
  } catch {
    return { ...PORTAL_SETTING_DEFAULTS }
  }
}

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  const hostedDatabase = isSupabaseRuntimeConfigured()
  const snapshot = hostedDatabase ? null : readMaintenanceSnapshot()
  if (snapshot) return snapshot

  const stored = await getStoredPortalSettings()
  const message = stored.get('maintenance_message')
  const settings = {
    enabled: parseSetting(stored.get('maintenance_mode'), PORTAL_SETTING_DEFAULTS.maintenance_mode),
    message: typeof message === 'string' && message.trim()
      ? message.trim()
      : DEFAULT_MAINTENANCE_MESSAGE,
  }
  if (!hostedDatabase) writeMaintenanceSnapshot(settings)
  return settings
}

export async function savePortalSetting(key: PortalSettingKey, value: boolean): Promise<void> {
  const supabase = createSupabaseServiceClient()
  const { data: existing, error: readError } = await supabase
    .from('cgs_portal_settings')
    .select('id, created_at')
    .eq('key', key)
    .maybeSingle()
  if (readError) throw new Error('Portal settings could not be loaded.')

  const now = new Date().toISOString()
  const { error } = await supabase.from('cgs_portal_settings').upsert(
    {
      id: existing?.id ?? `setting-${key}`,
      key,
      value: String(value),
      created_at: existing?.created_at ?? now,
      updated_at: now,
    },
    { onConflict: 'key' },
  )
  if (error) throw new Error('Portal setting could not be saved.')
  if (key === 'maintenance_mode' && !isSupabaseRuntimeConfigured()) writeMaintenanceSnapshot({ enabled: value })
}

export async function saveMaintenanceMessage(value: string): Promise<void> {
  const supabase = createSupabaseServiceClient()
  const { data: existing, error: readError } = await supabase
    .from('cgs_portal_settings')
    .select('id, created_at')
    .eq('key', 'maintenance_message')
    .maybeSingle()
  if (readError) throw new Error('Portal settings could not be loaded.')

  const now = new Date().toISOString()
  const { error } = await supabase.from('cgs_portal_settings').upsert(
    {
      id: existing?.id ?? 'setting-maintenance_message',
      key: 'maintenance_message',
      value,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    },
    { onConflict: 'key' },
  )
  if (error) throw new Error('Maintenance message could not be saved.')
  if (!isSupabaseRuntimeConfigured()) writeMaintenanceSnapshot({ message: value })
}

export async function resetPortalSettings(): Promise<void> {
  for (const [key, value] of Object.entries(PORTAL_SETTING_DEFAULTS) as [PortalSettingKey, boolean][]) {
    await savePortalSetting(key, value)
  }
  await saveMaintenanceMessage(DEFAULT_MAINTENANCE_MESSAGE)
}
