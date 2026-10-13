import { getDbClient } from '../config/db'
import { InboxMessage } from '../models/user.model'
import { AppError } from '../utils/AppError'
import { logger } from '../utils/logger'

// In-memory idempotency deduplication cache
const submissionCache = new Map<string, { hash: string; timestamp: number }>()

function isDuplicate(key: string, digest: string, windowSeconds = 60): boolean {
  const now = Date.now()
  const existing = submissionCache.get(key)
  if (existing && now - existing.timestamp < windowSeconds * 1000 && existing.hash === digest) {
    return true
  }
  submissionCache.set(key, { hash: digest, timestamp: now })
  return false
}

export class UserService {
  /**
   * Persists a contact inquiry or speaker proposal to the inbox
   */
  static async createContactMessage(data: {
    name: string
    email: string
    message: string
    source: string
    metadata?: Record<string, unknown>
  }): Promise<{ success: boolean; message: string }> {
    const db = getDbClient()
    if (!db) {
      throw new AppError('Contact submission is temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE')
    }

    const digest = `${data.email}:${data.message}`
    if (isDuplicate(`contact:${data.email}`, digest, 60)) {
      logger.info('Duplicate contact submission blocked gracefully', { email: data.email })
      return {
        success: true,
        message:
          data.source === 'speaker-application'
            ? 'Speaker proposal received successfully.'
            : 'Message received successfully. We will get back to you soon!',
      }
    }

    const payload: InboxMessage = {
      kind: 'contact',
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      message: data.message.trim(),
      metadata: { source: data.source, ...data.metadata },
      status: 'new',
    }

    const { error } = await db.from('cgs_inbox_messages').insert(payload)
    if (error) {
      logger.error('Failed to save contact message to database:', { code: error.code })
      throw new AppError('Contact submission is temporarily unavailable.', 503, 'DATABASE_ERROR')
    }

    logger.info('Contact message saved successfully', { source: data.source })
    return {
      success: true,
      message:
        data.source === 'speaker-application'
          ? 'Speaker proposal received successfully.'
          : 'Message received successfully. We will get back to you soon!',
    }
  }

  /**
   * Persists a quick membership interest application
   */
  static async createQuickJoin(data: {
    fullName: string
    email: string
    motivation: string
    age?: string | null
    background?: string | null
  }): Promise<{ success: boolean; message: string }> {
    const db = getDbClient()
    if (!db) {
      throw new AppError('Application submission is temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE')
    }

    const digest = `${data.email}:${data.motivation}`
    if (isDuplicate(`join:${data.email}`, digest, 60)) {
      logger.info('Duplicate join submission blocked gracefully', { email: data.email })
      return {
        success: true,
        message: 'Application received successfully. Welcome to Cyber Guardian Society!',
      }
    }

    const payload: InboxMessage = {
      kind: 'membership_interest',
      name: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      message: data.motivation.trim(),
      metadata: {
        age: data.age || null,
        background: data.background || null,
        source: 'express-join-api',
      },
      status: 'new',
    }

    const { error } = await db.from('cgs_inbox_messages').insert(payload)
    if (error) {
      logger.error('Failed to save quick join application:', { code: error.code })
      throw new AppError('Application submission is temporarily unavailable.', 503, 'DATABASE_ERROR')
    }

    logger.info('Quick join application saved successfully')
    return {
      success: true,
      message: 'Application received successfully. Welcome to Cyber Guardian Society!',
    }
  }
}
