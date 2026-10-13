import 'server-only'
import { maskEmail, maskIp } from '@/lib/security/input-sanitizer'
import { getClientIp } from '@/lib/security/public-rate-limiter'

export type PublicFormAction =
  | 'contact_submission_success'
  | 'contact_submission_rejected'
  | 'contact_rate_limited'
  | 'contact_duplicate_blocked'
  | 'speaker_application_success'
  | 'speaker_application_rejected'
  | 'speaker_application_closed'
  | 'join_application_success'
  | 'join_application_rejected'
  | 'join_application_closed'
  | 'join_rate_limited'
  | 'join_duplicate_blocked'
  | 'join_storage_failure'
  | 'join_database_failure'
  | 'newsletter_subscription_success'
  | 'newsletter_subscription_rejected'
  | 'newsletter_rate_limited'
  | 'newsletter_database_failure'

export interface LogPublicFormEventOptions {
  action: PublicFormAction
  request: Request
  email?: string
  entityId?: string
  details?: Record<string, unknown>
  error?: unknown
}

/**
 * Logs a privacy-preserving structured event for public form submissions.
 * Automatically masks personal identifiers (emails, IP addresses) in general logs
 * while preserving necessary operational indicators.
 */
export async function logPublicFormEvent({
  action,
  request,
  email,
  entityId,
  details = {},
  error,
}: LogPublicFormEventOptions): Promise<void> {
  const clientIp = getClientIp(request)
  const maskedClientIp = maskIp(clientIp)
  const maskedEmail = email ? maskEmail(email) : undefined
  const timestamp = new Date().toISOString()

  const safeDetails: Record<string, unknown> = {
    ...details,
    client_ip_masked: maskedClientIp,
    timestamp,
  }

  if (maskedEmail) {
    safeDetails.email_masked = maskedEmail
  }

  if (error) {
    safeDetails.error_type = error instanceof Error ? error.name : typeof error
  }

  // Structured stdout log (safe, no raw PII)
  console.info(`[PublicFormSecurity] ${action}`, {
    action,
    entityId,
    clientIp: maskedClientIp,
    details: safeDetails,
  })
}
