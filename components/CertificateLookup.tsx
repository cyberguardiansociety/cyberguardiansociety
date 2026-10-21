'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

type CertificateDetails = {
  id: string
  participant: string
  email?: string
  sessionTitle: string
  issuedAt: string
  status?: string
  hasImage?: boolean
  imageUrl?: string
  downloadUrl?: string
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
  const [isSuccess, setIsSuccess] = useState(false)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function verifyCertificate(value: string) {
    const normalizedCode = value.trim()
    if (!normalizedCode) {
      setMessage('Please enter your certificate reference ID.')
      setIsSuccess(false)
      setCertificate(null)
      return
    }

    setPending(true)
    setCertificate(null)
    setMessage('')
    setIsSuccess(false)

    try {
      const response = await fetch(`/api/certificates/verify?code=${encodeURIComponent(normalizedCode)}`, {
        cache: 'no-store',
      })
      const result = (await response.json()) as LookupResponse

      if (!response.ok || !result.valid || !result.certificate) {
        setIsSuccess(false)
        setCertificate(null)
        setMessage(result.message || 'No certificate found matching this reference ID. Please check the ID and try again.')
        return
      }

      setCertificate(result.certificate)
      setIsSuccess(true)
      // Exactly as requested: success notification that your certificate is verified from cgs
      setMessage('Your certificate is verified from CGS')
    } catch {
      setIsSuccess(false)
      setCertificate(null)
      setMessage('Certificate verification service is temporarily unavailable. Please try again.')
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    if (initialCode) {
      void verifyCertificate(initialCode)
    }
  }, [initialCode])

  const handleCopyId = () => {
    if (!certificate) return
    void navigator.clipboard.writeText(certificate.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadPdf = async () => {
    if (!certificate) return
    setDownloading(true)
    try {
      const downloadUrl = `/api/certificates/download?code=${encodeURIComponent(certificate.id)}`
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `CGS-Certificate-${certificate.id.replace(/^CGS-/, '')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setTimeout(() => setDownloading(false), 1500)
    }
  }

  return (
    <div className="certificate-lookup-layout">
      {/* ── Lookup Form Panel ────────────────────────────────────────── */}
      <section className="certificate-lookup-panel" aria-labelledby="certificate-lookup-heading">
        <div className="certificate-lookup-panel__icon">
          <ShieldCheck size={22} />
        </div>
        <p className="eyebrow">Official Verification Portal</p>
        <h2 id="certificate-lookup-heading">
          {mode === 'download' ? 'Download Your Verified Certificate' : 'Verify Certificate Authenticity'}
        </h2>
        <p className="certificate-lookup-copy">
          Enter the Reference ID provided on your participant certificate (e.g.{' '}
          <code className="certificate-code-chip">CGS-Y14QTT3A</code>). We will verify it against CGS official records.
        </p>

        <form
          className="certificate-lookup-form"
          onSubmit={(event) => {
            event.preventDefault()
            void verifyCertificate(code)
          }}
        >
          <label htmlFor={`certificate-code-${mode}`}>Certificate Reference ID</label>
          <div className="certificate-input-group">
            <input
              id={`certificate-code-${mode}`}
              autoComplete="off"
              spellCheck={false}
              maxLength={64}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. CGS-Y14QTT3A"
              required
              className="certificate-input-field"
            />
          </div>

          <button type="submit" disabled={pending} className="certificate-submit-btn">
            {pending ? (
              <LoaderCircle size={16} className="certificate-spinner animate-spin" />
            ) : (
              <ShieldCheck size={16} />
            )}
            {pending ? 'Verifying certificate…' : mode === 'download' ? 'Find & Verify Certificate' : 'Verify Certificate'}
          </button>

          {/* Success / Error Notification */}
          {message ? (
            <div
              role={isSuccess ? 'status' : 'alert'}
              className={`certificate-lookup-message ${isSuccess ? 'is-valid' : 'is-invalid'}`}
            >
              {isSuccess ? <BadgeCheck size={20} className="text-emerald-400" /> : <ShieldAlert size={20} className="text-red-400" />}
              <div className="certificate-message-text">
                <strong>{message}</strong>
                {isSuccess && certificate && (
                  <span className="certificate-submessage">
                    Recipient: {certificate.participant} · Authentic record issued by Cyber Guardian Society
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </form>
      </section>

      {/* ── Result & Download Panel ──────────────────────────────────── */}
      <section
        className="certificate-result"
        aria-label={certificate ? 'Verified certificate details' : 'Certificate details'}
      >
        {certificate ? (
          <div className="certificate-verified-card">
            {/* Top Verified Ribbon */}
            <div className="certificate-verified-header">
              <span className="certificate-security-tag">
                <BadgeCheck size={16} /> Verified Authentic
              </span>
              <span className="certificate-org-tag">Cyber Guardian Society</span>
            </div>

            {/* Certificate Image Preview if Available */}
            {certificate.imageUrl && (
              <div className="certificate-preview-container">
                <div
                  className="certificate-image-wrapper"
                  onClick={() => setPreviewOpen(true)}
                  title="Click to view full certificate"
                >
                  <img
                    src={certificate.imageUrl}
                    alt={`Certificate for ${certificate.participant}`}
                    className="certificate-preview-img"
                    loading="lazy"
                  />
                  <div className="certificate-preview-overlay">
                    <span>
                      <Eye size={18} /> View Certificate
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Verified Details Card */}
            <div className="certificate-paper">
              <div className="certificate-paper__topline">
                <span>CGS / OFFICIAL CREDENTIAL</span>
                <BadgeCheck size={18} className="text-emerald-400" />
              </div>
              <div className="certificate-paper__content">
                <p className="certificate-type-label">Certificate of Participation</p>
                <h2 className="certificate-recipient-name">{certificate.participant}</h2>
                <span className="certificate-for-label">for participating in</span>
                <h3 className="certificate-session-title">{certificate.sessionTitle}</h3>
                <small className="certificate-issue-meta">Issued on {formatDate(certificate.issuedAt)}</small>
              </div>

              <div className="certificate-id-box">
                <span className="certificate-id-label">Reference ID:</span>
                <code className="certificate-id-code">{certificate.id}</code>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="certificate-copy-btn"
                  title="Copy Reference ID"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="certificate-actions-row">
              <button
                type="button"
                className="certificate-download-button"
                onClick={handleDownloadPdf}
                disabled={downloading}
              >
                {downloading ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {downloading ? 'Preparing PDF…' : 'Download Certificate in PDF'}
              </button>

              {mode === 'verify' && (
                <Link
                  className="certificate-direct-link"
                  href={`/download-certificate?code=${encodeURIComponent(certificate.id)}`}
                >
                  Open in Download Portal <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="certificate-empty-state">
            <div className="certificate-empty-icon">
              <ShieldCheck size={32} />
            </div>
            <h2>{mode === 'download' ? 'Enter Reference ID to Download' : 'Check a Certificate Record'}</h2>
            <p>
              Enter the unique reference ID printed on your Cyber Guardian Society certificate to verify its validity and
              download it in high-resolution PDF format.
            </p>
            <div className="certificate-sample-hints">
              <span>Sample Reference ID:</span>
              <button
                type="button"
                className="certificate-hint-chip"
                onClick={() => {
                  setCode('CGS-Y14QTT3A')
                  void verifyCertificate('CGS-Y14QTT3A')
                }}
              >
                CGS-Y14QTT3A
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Modal for Full Image View ─────────────────────────────────── */}
      {previewOpen && certificate?.imageUrl && (
        <div className="certificate-modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="certificate-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="certificate-modal-header">
              <h3>Certificate of Participation — {certificate.participant}</h3>
              <button
                type="button"
                className="certificate-modal-close"
                onClick={() => setPreviewOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="certificate-modal-body">
              <img
                src={certificate.imageUrl}
                alt={`Official Certificate for ${certificate.participant}`}
                className="certificate-full-img"
              />
            </div>
            <div className="certificate-modal-footer">
              <button
                type="button"
                className="certificate-download-button"
                onClick={handleDownloadPdf}
                disabled={downloading}
              >
                <Download size={16} /> Download in PDF Format
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value))
  } catch {
    return value
  }
}