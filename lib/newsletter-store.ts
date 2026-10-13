import fs from 'fs'
import path from 'path'

/**
 * Newsletter subscriptions store.
 *
 * Subscriptions are persisted to a local JSON file so the "Stay in the loop"
 * band performs a real write rather than faking success. This mirrors the
 * local-store pattern used by `managed-content-store.ts`.
 *
 * TODO(production): swap `persistSubscription` for a call to the real email
 * service provider (Mailchimp / Buttondown / Resend audiences, etc.) so
 * subscribers land in the marketing list. The API route is the single place
 * to change — the client already talks to `/api/newsletter`.
 */

const DATA_DIR = path.join(process.cwd(), 'data')
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'newsletter-subscribers.json')

export type NewsletterSubscriber = {
  email: string
  source: string
  subscribedAt: string
}

function readSubscribers(): NewsletterSubscriber[] {
  try {
    if (!fs.existsSync(SUBSCRIBERS_FILE)) return []
    const raw = fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as NewsletterSubscriber[]) : []
  } catch (err) {
    console.warn('[newsletter-store] Failed to read subscribers:', err)
    return []
  }
}

function writeSubscribers(list: NewsletterSubscriber[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(list, null, 2), 'utf-8')
  } catch (err) {
    console.error('[newsletter-store] Failed to write subscribers:', err)
  }
}

/** Returns true if the email already exists in the list. */
export function hasSubscriber(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return readSubscribers().some((s) => s.email === normalized)
}

/**
 * Persists a subscription. Returns the stored record, or null if the email is
 * already subscribed (idempotent — no duplicate rows).
 */
export function persistSubscription(email: string, source: string): NewsletterSubscriber | null {
  const normalized = email.trim().toLowerCase()
  const list = readSubscribers()

  if (list.some((s) => s.email === normalized)) {
    return null
  }

  const record: NewsletterSubscriber = {
    email: normalized,
    source: source || 'team-page',
    subscribedAt: new Date().toISOString(),
  }
  list.push(record)
  writeSubscribers(list)
  return record
}
