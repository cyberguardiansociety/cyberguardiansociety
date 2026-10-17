import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { isSupabaseRuntimeConfigured } from '@/lib/supabase/config'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

/**
 * Newsletter subscriptions store.
 *
 * Subscriptions are persisted to a local JSON file so the "Stay in the loop"
 * band performs a real write rather than faking success. This mirrors the
 * local-store pattern used by `managed-content-store.ts`.
 */

const DATA_DIR = path.join(process.cwd(), 'data')
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'newsletter-subscribers.json')

export type NewsletterSubscriber = {
  email: string
  source: string
  subscribedAt: string
}

function sanitizeSource(rawSource: unknown): string {
  if (typeof rawSource !== 'string') return 'team-page'
  const cleaned = rawSource.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 50)
  return cleaned || 'team-page'
}

function readSubscribers(): NewsletterSubscriber[] {
  try {
    if (!fs.existsSync(SUBSCRIBERS_FILE)) return []
    const raw = fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8')
    if (!raw.trim()) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as NewsletterSubscriber[]) : []
  } catch (err) {
    console.error('[newsletter-store] Failed to read subscribers from disk:', err)
    throw new Error('Local subscriber storage is corrupted or unreadable.')
  }
}

function writeSubscribers(list: NewsletterSubscriber[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    const tempFile = `${SUBSCRIBERS_FILE}.${process.pid}.${randomUUID()}.tmp`
    fs.writeFileSync(tempFile, JSON.stringify(list, null, 2), 'utf-8')
    try {
      fs.renameSync(tempFile, SUBSCRIBERS_FILE)
    } catch {
      fs.copyFileSync(tempFile, SUBSCRIBERS_FILE)
      try { fs.unlinkSync(tempFile) } catch {}
    }
  } catch (err) {
    console.error('[newsletter-store] Failed to write subscribers:', err)
    throw new Error('Newsletter subscribers could not be saved to storage.')
  }
}

/** Returns true if the email already exists in the list. */
export async function hasSubscriber(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (isSupabaseRuntimeConfigured()) {
    const { data, error } = await createSupabaseServiceClient().from('newsletter_subscribers')
      .select('email').eq('email', normalized).maybeSingle()
    if (error) throw new Error('Newsletter subscriptions could not be checked.')
    return Boolean(data)
  }
  return readSubscribers().some((s) => s.email === normalized)
}

/**
 * Persists a subscription. Returns the stored record, or null if the email is
 * already subscribed (idempotent — no duplicate rows).
 */
export async function persistSubscription(email: string, source: string): Promise<NewsletterSubscriber | null> {
  const normalized = email.trim().toLowerCase()
  const safeSource = sanitizeSource(source)

  if (isSupabaseRuntimeConfigured()) {
    const record = {
      email: normalized,
      source: safeSource,
      subscribed_at: new Date().toISOString(),
    }
    const { error } = await createSupabaseServiceClient().from('newsletter_subscribers').insert(record)
    if (error?.code === '23505') return null
    if (error) throw new Error('Newsletter subscription could not be saved.')
    return { email: record.email, source: record.source, subscribedAt: record.subscribed_at }
  }

  const list = readSubscribers()

  if (list.some((s) => s.email === normalized)) {
    return null
  }

  const record: NewsletterSubscriber = {
    email: normalized,
    source: safeSource,
    subscribedAt: new Date().toISOString(),
  }
  list.push(record)
  writeSubscribers(list)
  return record
}
