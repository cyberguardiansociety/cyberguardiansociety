import { NextResponse } from 'next/server'
import { hasSameOrigin, readJsonBody } from '@/lib/api-security'
import { NewsletterSchema } from '@/lib/schemas/public-forms'
import { checkRateLimit, RATE_LIMIT_POLICIES } from '@/lib/security/public-rate-limiter'
import { logPublicFormEvent } from '@/lib/security/public-form-audit'
import { persistSubscription } from '@/lib/newsletter-store'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 2 * 1024 // 2 KB — a newsletter signup is a single email

export async function POST(request: Request) {
  // 1. Origin verification
  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { error: 'Request origin is not allowed.', code: 'ORIGIN_NOT_ALLOWED' },
      { status: 403 },
    )
  }

  // 2. Sliding-window rate limit (5 requests per 10 minutes per IP)
  const rateLimit = await checkRateLimit(request, RATE_LIMIT_POLICIES.NEWSLETTER)
  if (!rateLimit.allowed) {
    await logPublicFormEvent({
      action: 'newsletter_rate_limited',
      request,
      details: {
        retryAfter: rateLimit.retryAfterSeconds,
        limit: rateLimit.totalLimit,
      },
    })

    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.', code: 'RATE_LIMITED' },
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

  // 4. Strict Zod validation
  const parseResult = NewsletterSchema.safeParse(body.data)
  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] ? String(issue.path[0]) : 'email'
      if (!fieldErrors[field]) fieldErrors[field] = issue.message
    }

    await logPublicFormEvent({
      action: 'newsletter_subscription_rejected',
      request,
      details: { errors: fieldErrors },
    })

    return NextResponse.json(
      { error: 'Please enter a valid email address.', code: 'VALIDATION', errors: fieldErrors },
      { status: 400 },
    )
  }

  const { email, source } = parseResult.data

  // 5. Persist subscription with uniform response to prevent enumeration
  let record
  try {
    record = await persistSubscription(email, source)
  } catch (error) {
    await logPublicFormEvent({ action: 'newsletter_database_failure', request, email, error })
    return NextResponse.json(
      { error: 'Subscription is temporarily unavailable. Please try again soon.', code: 'SERVICE_UNAVAILABLE' },
      { status: 503 },
    )
  }

  await logPublicFormEvent({
    action: 'newsletter_subscription_success',
    request,
    email,
    details: { source, alreadySubscribed: !record },
  })

  return NextResponse.json({
    success: true,
    message: "You're on the list! Check your inbox to confirm.",
  })
}
