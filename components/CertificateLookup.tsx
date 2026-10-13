'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Download, LoaderCircle, ShieldCheck } from 'lucide-react'
import jsPDF from 'jspdf'

type CertificateDetails = {
  id: string
  participant: string
  sessionTitle: string
  issuedAt: string
}

type LookupResponse = {
  valid: boolean
  message: string
  certificate?: CertificateDetails
}

export default function CertificateLookup({
  mode,
  initialCode = '',
}: {
  mode: 'verify' | 'download'
  initialCode?: string
}) {
  const [code, setCode] = useState(initialCode)
  const [certificate, setCertificate] = useState<CertificateDetails | null>(null)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function verifyCertificate(value: string) {
    const normalizedCode = value.trim()
    setPending(true)
    setCertificate(null)
    setMessage('')
    try {
      const response = await fetch(`/api/certificates/verify?code=${encodeURIComponent(normalizedCode)}`, {
        cache: 'no-store',
      })
      const result = await response.json() as LookupResponse
      if (!response.ok || !result.valid || !result.certificate) {
        setMessage(result.message || 'We could not verify that certificate. Check the ID and try again.')
        return
      }
      setCertificate(result.certificate)
      setMessage(result.message)
    } catch {
      setMessage('Certificate lookup is temporarily unavailable. Please try again.')
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    if (mode === 'download' && initialCode) void verifyCertificate(initialCode)
  }, [initialCode, mode])

  function downloadPdf() {
    if (!certificate) return
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    pdf.setFillColor(18, 24, 38)
    pdf.rect(0, 0, pageWidth, pageHeight, 'F')
    pdf.setDrawColor(46, 196, 182)
    pdf.setLineWidth(1.2)
    pdf.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 3, 3, 'S')
    pdf.setTextColor(46, 196, 182)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('CYBER GUARDIAN SOCIETY', pageWidth / 2, 43, { align: 'center' })
    pdf.setTextColor(248, 250, 252)
    pdf.setFontSize(30)
    pdf.text('Certificate of Participation', pageWidth / 2, 72, { align: 'center' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(13)
    pdf.text('This recognizes', pageWidth / 2, 94, { align: 'center' })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(25)
    pdf.text(certificate.participant, pageWidth / 2, 110, { align: 'center', maxWidth: pageWidth - 50 })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(13)
    pdf.text('for participating in', pageWidth / 2, 126, { align: 'center' })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text(certificate.sessionTitle, pageWidth / 2, 140, { align: 'center', maxWidth: pageWidth - 50 })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(248, 250, 252)
    pdf.text(`Issued ${formatDate(certificate.issuedAt)}  ·  Certificate ID ${certificate.id}`, pageWidth / 2, 167, { align: 'center' })
    pdf.setTextColor(108, 99, 255)
    pdf.text(`Verify this certificate at ${window.location.origin}/verify-certificate`, pageWidth / 2, 179, { align: 'center' })
    pdf.save(`CGS-Certificate-${certificate.id.replace(/^CGS-/, '').slice(0, 8).toUpperCase()}.pdf`)
  }

  return (
    <div className="certificate-lookup-layout">
      <section className="certificate-lookup-panel" aria-labelledby="certificate-lookup-heading">
        <div className="certificate-lookup-panel__icon"><ShieldCheck size={21} /></div>
        <p className="eyebrow">Secure record lookup</p>
        <h2 id="certificate-lookup-heading">Enter your certificate ID</h2>
        <p className="certificate-lookup-copy">Enter the complete number printed on your certificate or attendance confirmation. It must start with CGS-.</p>
        <form
          className="certificate-lookup-form"
          onSubmit={(event) => {
            event.preventDefault()
            void verifyCertificate(code)
          }}
        >
          <label htmlFor={`certificate-code-${mode}`}>Certificate ID</label>
          <input
            id={`certificate-code-${mode}`}
            autoComplete="off"
            spellCheck={false}
            maxLength={40}
            pattern="CGS-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"
            title="Enter the full certificate number, including the CGS- prefix."
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="CGS-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
          />
          <button type="submit" disabled={pending}>
            {pending ? <LoaderCircle size={16} className="certificate-spinner" /> : <ShieldCheck size={16} />}
            {pending ? 'Checking certificate…' : 'Verify certificate'}
          </button>
          {message ? (
            <p role={certificate ? 'status' : 'alert'} className={`certificate-lookup-message${certificate ? ' is-valid' : ' is-invalid'}`}>
              {certificate ? <BadgeCheck size={17} /> : <ShieldCheck size={17} />}
              {message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="certificate-result" aria-label={certificate ? 'Verified certificate details' : 'Certificate details'}>
        {certificate ? (
          <>
            <div className="certificate-paper">
              <div className="certificate-paper__topline">
                <span>CGS / RECORDS</span>
                <BadgeCheck size={19} aria-label="Verified certificate" />
              </div>
              <div className="certificate-paper__content">
                <p>Certificate of Participation</p>
                <h2>{certificate.participant}</h2>
                <span>participated in</span>
                <h3>{certificate.sessionTitle}</h3>
                <small>Issued {formatDate(certificate.issuedAt)}</small>
              </div>
              <div className="certificate-paper__id">Certificate ID: {certificate.id}</div>
            </div>
            {mode === 'download' ? (
              <button type="button" className="certificate-download-button" onClick={downloadPdf}>
                <Download size={16} /> Download certificate PDF
              </button>
            ) : (
              <Link className="certificate-download-button" href={`/download-certificate?code=${encodeURIComponent(certificate.id)}`}>
                <Download size={16} /> Download this certificate <ArrowRight size={15} />
              </Link>
            )}
          </>
        ) : (
          <div className="certificate-empty-state">
            <span><ShieldCheck size={24} /></span>
            <h2>{mode === 'download' ? 'Your certificate will appear here' : 'Check a certificate record'}</h2>
            <p>Enter a certificate ID to confirm the participant, session, and issue date.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value))
}