import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getCertificateImagePath } from '@/lib/certificates-store'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ref = (searchParams.get('ref') || '').trim()

  if (!ref) {
    return NextResponse.json({ error: 'Certificate reference required' }, { status: 400 })
  }

  const imagePath = getCertificateImagePath(ref)
  if (!imagePath || !fs.existsSync(imagePath)) {
    return NextResponse.json({ error: 'Certificate image not found' }, { status: 404 })
  }

  try {
    const fileBuffer = fs.readFileSync(imagePath)
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      },
    })
  } catch (err) {
    console.error('[certificates-image] Error serving certificate image:', err)
    return NextResponse.json({ error: 'Could not load certificate image' }, { status: 500 })
  }
}
