import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMIT_POLICIES } from '@/lib/security/public-rate-limiter'
import { lookupCertificate } from '@/lib/certificates-store'
import { logVerificationAttempt, isHighAccuracyValidVerification } from '@/lib/certificate-logs-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handleVerification(rawCodeInput: string, request: Request) {
  const rateLimit = await checkRateLimit(request, RATE_LIMIT_POLICIES.CERTIFICATE_VERIFY)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { valid: false, message: 'Too many verification lookups. Please try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  const rawCode = (rawCodeInput || '').trim()

  // 1. High Accuracy Filter: Discard empty queries/submissions immediately.
  // DO NOT record empty queries to database or verification logs.
  if (!rawCode) {
    return NextResponse.json(
      { valid: false, message: 'Please enter a certificate reference ID (e.g. CGS-XXXXXXXX).' },
      { status: 400 },
    )
  }

  // 2. Query authoritative records (certificate_status.json and Supabase cgs_attendance_records)
  const cert = await lookupCertificate(rawCode)

  // 3. High Accuracy Filter: Filter out non-existent / invalid certificate lookups.
  // DO NOT record failed or invalid queries into Supabase database or verification logs.
  if (!cert) {
    return NextResponse.json(
      {
        valid: false,
        message: 'No certificate found matching this reference ID. Please check the ID and try again.',
      },
      { status: 404 },
    )
  }

  // 4. High Accuracy Validation: Verify structure, authentic reference ID, and participant name
  const isValid = isHighAccuracyValidVerification({
    reference_id: cert.ref_id,
    participant_name: cert.name,
    participant_email: cert.email,
    status: 'success',
    message: `Certificate verified from CGS for ${cert.name}`,
  })

  if (!isValid) {
    return NextResponse.json(
      {
        valid: false,
        message: 'Certificate record could not be verified with high accuracy.',
      },
      { status: 422 },
    )
  }

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    '127.0.0.1'
  const userAgent = request.headers.get('user-agent')?.slice(0, 255) || 'Unknown Browser'

  // 5. High-Accuracy Recording: Record ONLY genuine, verified certificates to Supabase and audit logs
  await logVerificationAttempt({
    reference_id: cert.ref_id,
    participant_name: cert.name,
    participant_email: cert.email,
    status: 'success',
    message: `Certificate verified from CGS for ${cert.name}`,
    ip_address: clientIp,
    user_agent: userAgent,
  })

  return NextResponse.json(
    {
      valid: true,
      message: 'Your certificate is verified from CGS',
      certificate: {
        id: cert.ref_id,
        participant: cert.name,
        email: cert.email,
        sessionTitle: cert.sessionTitle,
        issuedAt: cert.time,
        status: 'Authentic & Verified',
        hasImage: cert.hasImage,
        imageUrl: cert.imagePath,
        downloadUrl: `/api/certificates/download?code=${encodeURIComponent(cert.ref_id)}`,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawCode = (searchParams.get('code') || '').trim()
  return handleVerification(rawCode, request)
}

export async function POST(request: Request) {
  let rawCode = ''
  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await request.json()
      rawCode = (body?.code || body?.reference_id || '').trim()
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await request.formData()
      rawCode = String(formData.get('code') || formData.get('reference_id') || '').trim()
    }
  } catch {
    const { searchParams } = new URL(request.url)
    rawCode = (searchParams.get('code') || '').trim()
  }

  return handleVerification(rawCode, request)
}

