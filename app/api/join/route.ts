import { NextResponse } from 'next/server'
import { hasSameOrigin, readJsonBody } from '@/lib/api-security'
import { QuickJoinSchema } from '@/lib/schemas/public-forms'
import {
  checkDuplicateSubmission,
  checkRateLimit,
  RATE_LIMIT_POLICIES,
  recordSubmission,
} from '@/lib/security/public-rate-limiter'
import { logPublicFormEvent } from '@/lib/security/public-form-audit'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 16 * 1024 // 16 KB for quick join payload

export async function POST(request: Request) {
  // 1. Origin verification
  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { error: 'Request origin is not allowed.', code: 'ORIGIN_NOT_ALLOWED' },
      { status: 403 },
    )
  }

  // 2. Sliding-window rate limit (5 requests per 1 hour per IP)
  const rateLimit = await checkRateLimit(request, RATE_LIMIT_POLICIES.JOIN_QUICK)
  if (!rateLimit.allowed) {
    await logPublicFormEvent({
      action: 'join_rate_limited',
      request,
      details: {
        retryAfter: rateLimit.retryAfterSeconds,
        limit: rateLimit.totalLimit,
      },
    })

    return NextResponse.json(
      { error: 'Too many applications. Please try again later.', code: 'RATE_LIMITED' },
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
  const parseResult = QuickJoinSchema.safeParse(body.data)
  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] ? String(issue.path[0]) : 'form'
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message
      }
    }

    await logPublicFormEvent({
      action: 'join_application_rejected',
      request,
      details: { errors: fieldErrors },
    })

    return NextResponse.json(
      {
        error: 'Required fields are missing or invalid.',
        code: 'VALIDATION',
        errors: fieldErrors,
      },
      { status: 400 },
    )
  }

  const { fullName, email, motivation, age, background } = parseResult.data

  // 5. Duplicate Submission / Idempotency Check (60 seconds window)
  const payloadDigest = `${email}:${motivation}`
  const duplicateCheck = checkDuplicateSubmission('join-quick', email, payloadDigest, 60)
  if (duplicateCheck.isDuplicate) {
    await logPublicFormEvent({
      action: 'join_duplicate_blocked',
      request,
      email,
      details: { ageSeconds: duplicateCheck.ageSeconds },
    })

    return NextResponse.json({
      success: true,
      message: 'Application received successfully. Welcome to Cyber Guardian Society!',
    })
  }

  // 6. Supabase Persistence via Service Client
  let supabase: ReturnType<typeof createSupabaseServiceClient>
  try {
    supabase = createSupabaseServiceClient()
  } catch (err) {
    await logPublicFormEvent({
      action: 'join_database_failure',
      request,
      email,
      error: err,
    })
    return NextResponse.json(
      { error: 'Application submission is temporarily unavailable.', code: 'SERVICE_UNAVAILABLE' },
      { status: 503 },
    )
  }

  const { error: dbError } = await supabase.from('cgs_inbox_messages').insert({
    kind: 'membership_interest',
    name: fullName,
    email,
    message: motivation,
    metadata: {
      age: age || null,
      background: background || null,
      source: 'join-form',
    },
    status: 'new',
  })

  if (dbError) {
    await logPublicFormEvent({
      action: 'join_database_failure',
      request,
      email,
      details: { dbErrorCode: dbError.code },
    })
    return NextResponse.json(
      { error: 'Application submission is temporarily unavailable.', code: 'DATABASE_ERROR' },
      { status: 503 },
    )
  }

  // Record in duplicate cache
  recordSubmission('join-quick', email, payloadDigest)

  // Log successful submission
  await logPublicFormEvent({
    action: 'join_application_success',
    request,
    email,
    details: {
      source: 'join-form',
      has_age: Boolean(age),
      has_background: Boolean(background),
    },
  })

  return NextResponse.json({
    success: true,
    message: 'Application received successfully. Welcome to Cyber Guardian Society!',
  })
}
