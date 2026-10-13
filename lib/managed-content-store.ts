import fs from 'fs'
import path from 'path'
import { revalidatePath } from 'next/cache'
import type { ManagedContentType, ManagedContentItem } from '@/lib/site-content'
import { isSupabaseRuntimeConfigured } from '@/lib/supabase/config'

const DATA_DIR = path.join(process.cwd(), 'data')
const CONTENT_FILE = path.join(DATA_DIR, 'managed-content.json')

function readLocalContent(): ManagedContentItem[] {
  try {
    if (!fs.existsSync(CONTENT_FILE)) {
      // Seed with initial content if none exists
      return getDefaultContent()
    }
    const raw = fs.readFileSync(CONTENT_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ManagedContentItem[]) : getDefaultContent()
  } catch (err) {
    console.warn('[managed-content-store] Failed to read local content:', err)
    return getDefaultContent()
  }
}

function writeLocalContent(items: ManagedContentItem[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(items, null, 2), 'utf-8')
  } catch (err) {
    console.error('[managed-content-store] Failed to write local content:', err)
    throw new Error('Managed content could not be saved to local storage.')
  }
}

function getDefaultContent(): ManagedContentItem[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'd1000000-0000-0000-0000-000000000001',
      content_type: 'announcement',
      title: 'Registration Open for CGS Cybersecurity Bootcamp 2026',
      slug: 'registration-open-cgs-bootcamp-2026',
      summary: 'Applications are now open for our intensive threat hunting and blue team operations bootcamp.',
      body: 'Get hands-on experience in threat detection, DFIR, and defensive engineering. Free for accepted community members.',
      image_url: null,
      action_url: '/#join',
      category: 'COMMUNITY',
      price: null,
      currency: 'USD',
      status: 'published',
      sort_order: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'd1000000-0000-0000-0000-000000000002',
      content_type: 'product',
      title: 'CGS Threat Radar Toolkit',
      slug: 'cgs-threat-radar-toolkit',
      summary: 'Automated threat hunting telemetry collection scripts and alerting rules built for blue teams.',
      body: 'Community-developed signatures, Sigma rules, and endpoint telemetry parsing tools.',
      image_url: null,
      action_url: 'https://github.com/cyberguardiansociety',
      category: 'DEFENSIVE TOOLING',
      price: 0,
      currency: 'USD',
      status: 'published',
      sort_order: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'd1000000-0000-0000-0000-000000000003',
      content_type: 'resource',
      title: 'CGS Incident Response Field Guide',
      slug: 'cgs-incident-response-guide',
      summary: 'A structured, battle-tested playbook for triaging ransomware and active intrusions.',
      body: 'Step-by-step containment checklists, memory dump procedures, and stakeholder communication templates.',
      image_url: null,
      action_url: '/services',
      category: 'PLAYBOOK',
      price: null,
      currency: 'USD',
      status: 'published',
      sort_order: 1,
      created_at: now,
      updated_at: now,
    },
  ]
}

export async function getManagedContentItems(
  contentType: ManagedContentType,
  onlyPublished = false,
  supabase?: any
): Promise<ManagedContentItem[]> {
  const hostedDatabase = isSupabaseRuntimeConfigured()
  if (hostedDatabase && !supabase) throw new Error('The Supabase content store is unavailable.')
  const localList = hostedDatabase ? [] : readLocalContent()
  const map = new Map<string, ManagedContentItem>()

  for (const item of localList) {
    if (item.content_type === contentType) {
      map.set(item.id, item)
    }
  }

  if (supabase) {
    let query = supabase
      .from('cgs_managed_content')
      .select('*')
      .eq('content_type', contentType)

    if (onlyPublished) query = query.eq('status', 'published')
    const { data, error } = await query
    if (error) throw new Error('Managed content could not be loaded from the database.')
    if (Array.isArray(data)) {
      for (const row of data) map.set(row.id, row as ManagedContentItem)
    }
  }

  let results = Array.from(map.values())
  if (onlyPublished) {
    results = results.filter((item) => item.status === 'published')
  }

  return results.sort((a, b) => a.sort_order - b.sort_order || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function saveManagedContentItem(
  itemData: Partial<ManagedContentItem> & { content_type: ManagedContentType; title: string },
  userId: string,
  supabase?: any
): Promise<ManagedContentItem> {
  const hostedDatabase = isSupabaseRuntimeConfigured()
  if (hostedDatabase && !supabase) throw new Error('The Supabase content store is unavailable.')
  const now = new Date().toISOString()
  const id = itemData.id || crypto.randomUUID()
  const title = itemData.title.trim()
  const slug = itemData.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const record: ManagedContentItem = {
    id,
    content_type: itemData.content_type,
    title,
    slug: slug || `item-${id.slice(0, 8)}`,
    summary: itemData.summary || title,
    body: itemData.body || null,
    image_url: itemData.image_url || null,
    action_url: itemData.action_url || null,
    category: itemData.category || null,
    price: typeof itemData.price === 'number' ? itemData.price : null,
    currency: itemData.currency || 'USD',
    status: itemData.status || 'published',
    sort_order: typeof itemData.sort_order === 'number' ? itemData.sort_order : 100,
    created_at: itemData.created_at || now,
    updated_at: now,
  }

  // Hosted writes are database-first; only standalone local development uses
  // the JSON fallback store.
  if (supabase) {
    const { error } = await supabase.from('cgs_managed_content').upsert(
      { ...record, created_by: userId },
      { onConflict: 'id' },
    )
    if (error) throw new Error('Managed content could not be saved to the database.')
  }
  if (!hostedDatabase) {
    const localList = readLocalContent()
    const existingIdx = localList.findIndex((it) => it.id === id)
    if (existingIdx >= 0) localList[existingIdx] = { ...localList[existingIdx], ...record }
    else localList.unshift(record)
    writeLocalContent(localList)
  }

  // 3. Revalidate paths
  try {
    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/announcements')
    revalidatePath('/products')
  } catch {}

  return record
}

export async function deleteManagedContentItem(
  id: string,
  contentType: ManagedContentType,
  supabase?: any
): Promise<boolean> {
  const hostedDatabase = isSupabaseRuntimeConfigured()
  if (hostedDatabase && !supabase) throw new Error('The Supabase content store is unavailable.')
  const originalList = hostedDatabase ? [] : readLocalContent()
  const localList = originalList.filter((it) => !(it.id === id && it.content_type === contentType))
  let databaseDeleted = false
  if (supabase) {
    const { data, error } = await supabase
      .from('cgs_managed_content')
      .delete()
      .eq('id', id)
      .eq('content_type', contentType)
      .select('id')
    if (error) throw new Error('Managed content could not be deleted from the database.')
    databaseDeleted = Array.isArray(data) && data.length > 0
  }

  const localDeleted = localList.length !== originalList.length
  if (localDeleted) {
    try {
      writeLocalContent(localList)
    } catch (error) {
      if (databaseDeleted && supabase) {
        const record = originalList.find((item) => item.id === id && item.content_type === contentType)
        if (record) await supabase.from('cgs_managed_content').upsert(record, { onConflict: 'id' })
      }
      throw error
    }
  }

  if (!localDeleted && !databaseDeleted) return false

  try {
    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/announcements')
    revalidatePath('/products')
  } catch {}

  return true
}

export async function deleteAllDraftManagedContent(supabase?: any): Promise<number> {
  const contentTypes: ManagedContentType[] = ['announcement', 'product', 'merchandise', 'resource']
  const hostedDatabase = isSupabaseRuntimeConfigured()
  if (hostedDatabase && !supabase) throw new Error('The Supabase content store is unavailable.')
  const originalList = hostedDatabase ? [] : readLocalContent()
  const localList = originalList.filter(
    (item) => !(contentTypes.includes(item.content_type) && item.status === 'draft'),
  )
  const localDraftIds = originalList
    .filter((item) => contentTypes.includes(item.content_type) && item.status === 'draft')
    .map((item) => item.id)
  let databaseDrafts: ManagedContentItem[] = []
  let databaseDraftIds: string[] = []

  if (supabase) {
    const { data: rows, error: readError } = await supabase
      .from('cgs_managed_content')
      .select('*')
      .in('content_type', contentTypes)
      .eq('status', 'draft')
    if (readError) throw new Error('Draft content could not be loaded.')
    databaseDrafts = Array.isArray(rows) ? rows as ManagedContentItem[] : []
    const ids = Array.isArray(rows) ? rows.map((row: { id?: unknown }) => row.id).filter((id: unknown): id is string => typeof id === 'string') : []
    databaseDraftIds = ids
    if (ids.length) {
      const { data, error } = await supabase
        .from('cgs_managed_content')
        .delete()
        .in('id', ids)
        .select('id')
      if (error) throw new Error('Draft content could not be deleted from the database.')
      databaseDraftIds = Array.isArray(data)
        ? data.map((row: { id?: unknown }) => row.id).filter((id: unknown): id is string => typeof id === 'string')
        : []
    }
  }

  const localDeletedCount = originalList.length - localList.length
  if (localDeletedCount) {
    try {
      writeLocalContent(localList)
    } catch (error) {
      if (databaseDrafts.length && supabase) {
        await supabase.from('cgs_managed_content').upsert(databaseDrafts, { onConflict: 'id' })
      }
      throw error
    }
  }

  try {
    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/announcements')
    revalidatePath('/products')
    revalidatePath('/merch')
  } catch {}

  return new Set([...localDraftIds, ...databaseDraftIds]).size
}
