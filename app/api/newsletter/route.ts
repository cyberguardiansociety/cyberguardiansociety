import { NextResponse } from 'next/server'
import { hasSameOrigin, readJsonBody } from '@/lib/api-security'
import { NewsletterSchema } from '@/lib/schemas/public-forms'
import { checkRateLimit, RATE_LIMIT_POLICIES } from '@/lib/security/public-rate-limiter'
import { logPublicFormEvent } from '@/lib/security/public-form-audit'
import { hasSubscriber, persistSubscription } from '@/lib/newsletter-store'

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

  // 5. Idempotency — already subscribed is a success, not an error.
  if (hasSubscriber(email)) {
    await logPublicFormEvent({
      action: 'newsletter_subscription_success',
      request,
      email,
      details: { source, alreadySubscribed: true },
    })

    return NextResponse.json({
      success: true,
      message: "You're already on the list. Thanks for the enthusiasm!",
    })
  }

  // 6. Persist the subscription (real write — no fake success).
  const record = persistSubscription(email, source)
  if (!record) {
    // Lost a race with a concurrent duplicate — treat as success.
    return NextResponse.json({
      success: true,
      message: "You're already on the list. Thanks for the enthusiasm!",
    })
  }

  await logPublicFormEvent({
    action: 'newsletter_subscription_success',
    request,
    email,
    details: { source, alreadySubscribed: false },
  })

  return NextResponse.json({
    success: true,
    message: "You're on the list! Check your inbox to confirm.",
  })
}
