import { NextResponse } from 'next/server'
import { hasSameOrigin, readJsonBody } from '@/lib/api-security'
import { ContactSubmissionSchema } from '@/lib/schemas/public-forms'
import {
  checkDuplicateSubmission,
  checkRateLimit,
  RATE_LIMIT_POLICIES,
  recordSubmission,
} from '@/lib/security/public-rate-limiter'
import { logPublicFormEvent } from '@/lib/security/public-form-audit'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { getPortalSettings } from '@/lib/portal-settings'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 8 * 1024 // 8 KB for contact messages

export async function POST(request: Request) {
  // 1. Origin verification
  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { error: 'Request origin is not allowed.', code: 'ORIGIN_NOT_ALLOWED' },
      { status: 403 },
    )
  }

  // 2. Sliding-window rate limit (5 requests per 10 minutes per IP)
  const rateLimit = await checkRateLimit(request, RATE_LIMIT_POLICIES.CONTACT)
  if (!rateLimit.allowed) {
    await logPublicFormEvent({
      action: 'contact_rate_limited',
      request,
      details: {
        retryAfter: rateLimit.retryAfterSeconds,
        limit: rateLimit.totalLimit,
      },
    })

    return NextResponse.json(
      { error: 'Too many messages. Please try again later.', code: 'RATE_LIMITED' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
          'X-RateLimit-Limit': String(rateLimit.totalLimit),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  // 3. Bounded payload reading
  const body = await readJsonBody(request, MAX_BODY_BYTES)
  if (!body.ok) {
    return NextResponse.json(
      {
        error: body.error,
        code: body.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_REQUEST',
      },
      { status: body.status },
    )
  }

  // 4. Strict Zod Schema Validation
  const parseResult = ContactSubmissionSchema.safeParse(body.data)
  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] ? String(issue.path[0]) : 'form'
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message
      }
    }

    await logPublicFormEvent({
      action: 'contact_submission_rejected',
      request,
      details: { errors: fieldErrors },
    })

    return NextResponse.json(
      {
        error: 'Please correct the highlighted fields.',
        code: 'VALIDATION',
        errors: fieldErrors,
      },
      { status: 400 },
    )
  }

  const { name, email, message, source, metadata } = parseResult.data

  if (source === 'speaker-application') {
    try {
      if ((await getPortalSettings()).speaker_coming_soon) {
        await logPublicFormEvent({ action: 'speaker_application_closed', request, email })
        return NextResponse.json(
          { error: 'Speaker applications are temporarily closed.', code: 'FORM_COMING_SOON' },
          { status: 503 },
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'The application service is temporarily unavailable.', code: 'SETTINGS_UNAVAILABLE' },
        { status: 503 },
      )
    }
  }

  // 5. Duplicate Submission / Idempotency Check (60 seconds window)
  const payloadDigest = `${email}:${message}`
  const duplicateCheck = checkDuplicateSubmission('contact', email, payloadDigest, 60)
  if (duplicateCheck.isDuplicate) {
    await logPublicFormEvent({
      action: 'contact_duplicate_blocked',
      request,
      email,
      details: { ageSeconds: duplicateCheck.ageSeconds },
    })

    // Return successful response to client so UI displays success without creating duplicate rows
    return NextResponse.json({
      success: true,
      message:
        source === 'speaker-application'
          ? 'Speaker proposal received successfully.'
          : 'Message received successfully. We will get back to you soon!',
    })
  }

  // 6. Supabase Persistence via Service Client
  let supabase: ReturnType<typeof createSupabaseServiceClient>
  try {
    supabase = createSupabaseServiceClient()
  } catch (err) {
    await logPublicFormEvent({
      action: 'contact_submission_rejected',
      request,
      email,
      error: err,
    })
    return NextResponse.json(
      { error: 'Contact submission is temporarily unavailable.', code: 'SERVICE_UNAVAILABLE' },
      { status: 503 },
    )
  }

  const { error: dbError } = await supabase.from('cgs_inbox_messages').insert({
    kind: 'contact',
    name,
    email,
    message,
    metadata: {
      source,
      ...metadata,
    },
    status: 'new',
  })

  if (dbError) {
    await logPublicFormEvent({
      action: 'contact_submission_rejected',
      request,
      email,
      details: { dbErrorCode: dbError.code },
    })
    return NextResponse.json(
      { error: 'Contact submission is temporarily unavailable.', code: 'DATABASE_ERROR' },
      { status: 503 },
    )
  }

  // Record in idempotency cache
  recordSubmission('contact', email, payloadDigest)

  // Log successful event
  await logPublicFormEvent({
    action: source === 'speaker-application' ? 'speaker_application_success' : 'contact_submission_success',
    request,
    email,
    details: {
      source,
      has_metadata: Object.keys(metadata).length > 0,
    },
  })

  return NextResponse.json({
    success: true,
    message:
      source === 'speaker-application'
        ? 'Speaker proposal received successfully.'
        : 'Message received successfully. We will get back to you soon!',
  })
}
