import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMIT_POLICIES } from '@/lib/security/public-rate-limiter'
import { lookupCertificate } from '@/lib/certificates-store'
import { logVerificationAttempt } from '@/lib/certificate-logs-store'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const rateLimit = await checkRateLimit(request, RATE_LIMIT_POLICIES.CERTIFICATE_VERIFY)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { valid: false, message: 'Too many verification lookups. Please try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  const { searchParams } = new URL(request.url)
  const rawCode = (searchParams.get('code') || '').trim()

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    '127.0.0.1'
  const userAgent = request.headers.get('user-agent')?.slice(0, 255) || 'Unknown Browser'

  if (!rawCode) {
    await logVerificationAttempt({
      reference_id: 'EMPTY',
      participant_name: null,
      status: 'failed',
      message: 'Empty certificate reference ID provided',
      ip_address: clientIp,
      user_agent: userAgent,
    })
    return NextResponse.json(
      { valid: false, message: 'Please enter a certificate reference ID (e.g. CGS-XXXXXXXX).' },
      { status: 400 },
    )
  }

  const cert = await lookupCertificate(rawCode)

  if (!cert) {
    await logVerificationAttempt({
      reference_id: rawCode.toUpperCase(),
      participant_name: null,
      status: 'failed',
      message: `No certificate found matching Reference ID "${rawCode}"`,
      ip_address: clientIp,
      user_agent: userAgent,
    })

    return NextResponse.json(
      {
        valid: false,
        message: 'No certificate found matching this reference ID. Please check the ID and try again.',
      },
      { status: 404 },
    )
  }

  // Record successful verification
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
