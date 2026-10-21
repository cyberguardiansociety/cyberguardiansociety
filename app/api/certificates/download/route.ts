import { NextResponse } from 'next/server'
import fs from 'fs'
import { jsPDF } from 'jspdf'
import { lookupCertificate, getCertificateImagePath } from '@/lib/certificates-store'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = (searchParams.get('code') || '').trim()

  if (!code) {
    return NextResponse.json({ error: 'Certificate code is required.' }, { status: 400 })
  }

  const cert = await lookupCertificate(code)
  if (!cert) {
    return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 })
  }

  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    const imagePath = getCertificateImagePath(cert.ref_id)

    if (imagePath && fs.existsSync(imagePath)) {
      // Embed official high-resolution certificate image
      const imageBuf = fs.readFileSync(imagePath)
      const base64Image = `data:image/png;base64,${imageBuf.toString('base64')}`
      doc.addImage(base64Image, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
    } else {
      // Fallback: Generate beautifully styled CGS certificate
      doc.setFillColor(18, 24, 38)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')

      // Border frame
      doc.setDrawColor(46, 196, 182)
      doc.setLineWidth(1.2)
      doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 3, 3, 'S')

      doc.setTextColor(46, 196, 182)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('CYBER GUARDIAN SOCIETY', pageWidth / 2, 42, { align: 'center' })

      doc.setTextColor(248, 250, 252)
      doc.setFontSize(30)
      doc.text('Certificate of Participation', pageWidth / 2, 68, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(13)
      doc.text('This recognizes that', pageWidth / 2, 88, { align: 'center' })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(26)
      doc.setTextColor(59, 130, 246)
      doc.text(cert.name, pageWidth / 2, 108, { align: 'center', maxWidth: pageWidth - 50 })

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(248, 250, 252)
      doc.setFontSize(13)
      doc.text('has successfully participated in', pageWidth / 2, 124, { align: 'center' })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text(cert.sessionTitle, pageWidth / 2, 140, { align: 'center', maxWidth: pageWidth - 50 })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(148, 163, 184)
      const formattedDate = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(cert.time))
      doc.text(`Issued ${formattedDate}  ·  Reference ID: ${cert.ref_id}`, pageWidth / 2, 168, { align: 'center' })

      doc.setTextColor(108, 99, 255)
      doc.text('Verified official record from Cyber Guardian Society (CGS)', pageWidth / 2, 178, { align: 'center' })
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const filename = `CGS-Certificate-${cert.ref_id.toUpperCase().replace(/[^A-Z0-9_-]/g, '')}.pdf`

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[certificates-download] Error generating certificate PDF:', err)
    return NextResponse.json({ error: 'Could not generate certificate PDF.' }, { status: 500 })
  }
}
