import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import path from 'path'
import { getDerivedFileSigningSecret } from '@/lib/admin-config'
import { readPrivateObject } from '@/lib/supabase-storage'

export const runtime = 'nodejs'

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

/**
 * Serves private application files (CVs, application JSON) through a
 * short-lived HMAC-signed URL. The signature is minted server-side by
 * `createPrivateSignedUrl` in lib/supabase-storage.ts.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const relPath = searchParams.get('path') ?? ''
  const expiresRaw = searchParams.get('expires') ?? ''
  const signature = searchParams.get('sig') ?? ''
  const expires = Number(expiresRaw)

  const pathValid =
    relPath.length > 0 &&
    relPath.startsWith('applications/') &&
    !relPath.includes('..') &&
    !relPath.includes('\\') &&
    !relPath.includes('\0')
  const timeValid = Number.isFinite(expires) && expires >= Math.floor(Date.now() / 1000)

  if (!pathValid || !timeValid || signature.length !== 64) {
    return new NextResponse('Not found', { status: 404 })
  }

  const expected = createHmac('sha256', getDerivedFileSigningSecret())
    .update(`${relPath}|${expires}`)
    .digest('hex')
  const received = Buffer.from(signature, 'utf-8')
  const expectedBuffer = Buffer.from(expected, 'utf-8')
  if (received.length !== expectedBuffer.length || !timingSafeEqual(received, expectedBuffer)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const extension = path.extname(relPath).toLowerCase()
  const contentType = CONTENT_TYPES[extension] ?? 'application/octet-stream'
  const body = await readPrivateObject(relPath)
  if (!body) return new NextResponse('Not found', { status: 404 })

  const responseBody = new Uint8Array(body.length)
  responseBody.set(body)
  return new NextResponse(responseBody.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
