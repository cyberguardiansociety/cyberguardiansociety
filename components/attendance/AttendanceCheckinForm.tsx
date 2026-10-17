'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  Download,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'

type SubmissionResult = {
  success: boolean
  message: string
  code?: string
  certificateId?: string
  participantName?: string
  participantEmail?: string
  sessionTitle?: string
  markedAt?: string
  alreadyMarked?: boolean
}

export default function AttendanceCheckinForm({ sessionId }: { sessionId?: string }) {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [copied, setCopied] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function submit(formData: FormData) {
    setPending(true)
    setResult(null)
    setCopied(false)
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          sessionId: formData.get('sessionId') || sessionId || undefined,
        }),
      })
      const payload = (await response.json()) as SubmissionResult
      setResult(payload)
      if (payload.success) {
        formRef.current?.reset()
        if (payload.alreadyMarked) {
          toast('Your attendance is already on record for this session.', {
            icon: 'ℹ️',
            id: 'attendance-toast',
            duration: 6000,
          })
        } else {
          toast.success('Your attendance marked successfully!', {
            id: 'attendance-toast',
            duration: 6000,
          })
        }
      } else {
        toast.error(payload.message || 'Attendance verification failed.', {
          id: 'attendance-toast',
          duration: 6000,
        })
      }
    } catch {
      const msg = 'Attendance could not be verified. Please try again.'
      setResult({ success: false, message: msg })
      toast.error(msg, { id: 'attendance-toast', duration: 6000 })
    } finally {
      setPending(false)
    }
  }

  function handleCopyCertificate() {
    if (!result?.certificateId) return
    navigator.clipboard.writeText(result.certificateId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function resetCheckin() {
    setResult(null)
    setCopied(false)
  }

  // ── Success Notification Screen ──────────────────────────────────────────
  if (result?.success) {
    const formattedDate = result.markedAt
      ? new Intl.DateTimeFormat('en', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(result.markedAt))
      : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())

    return (
      <div className="attendance-success-screen" role="status" aria-live="polite">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 6000,
            style: {
              background: '#090d16',
              color: '#f1f5f9',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(16, 185, 129, 0.2)',
              fontSize: '14px',
              fontWeight: '500',
            },
          }}
        />

        <div className="attendance-notification-banner" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '12px',
          marginBottom: '20px',
          textAlign: 'left',
          width: '100%',
        }}>
          <CheckCircle2 size={24} className="text-emerald-400 shrink-0" style={{ color: '#34d399' }} />
          <div>
            <strong style={{ display: 'block', fontSize: '15px', color: '#10b981' }}>
              Your attendance marked successfully!
            </strong>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              Confirmed for {result.sessionTitle || 'this session'}. Your learning record is verified.
            </span>
          </div>
        </div>

        <div className="attendance-success-card">
          <div className="attendance-success-badge">
            <Sparkles size={14} className="text-emerald-400" />
            <span>{result.alreadyMarked ? 'Attendance on Record' : 'Attendance Verified & Recorded'}</span>
          </div>

          <div className="attendance-success-icon-wrap">
            <span className="attendance-success-pulse" />
            <ShieldCheck size={36} className="text-emerald-400" />
          </div>

          <h3 className="attendance-success-title">
            {result.alreadyMarked ? 'Attendance Confirmed' : 'Your Attendance Marked Successfully!'}
          </h3>

          <p className="attendance-success-subtitle">
            Welcome, <strong>{result.participantName || 'Participant'}</strong>! Your session attendance is verified and securely logged on the platform.
          </p>

          <div className="attendance-success-details">
            <div className="attendance-detail-row">
              <span className="attendance-detail-label">Participant</span>
              <strong className="attendance-detail-val">{result.participantName}</strong>
            </div>

            <div className="attendance-detail-row">
              <span className="attendance-detail-label">Registered Email</span>
              <span className="attendance-detail-val">{result.participantEmail}</span>
            </div>

            {result.sessionTitle && (
              <div className="attendance-detail-row">
                <span className="attendance-detail-label">Session</span>
                <strong className="attendance-detail-val text-blue-400">{result.sessionTitle}</strong>
              </div>
            )}

            <div className="attendance-detail-row">
              <span className="attendance-detail-label">Recorded At</span>
              <span className="attendance-detail-val">{formattedDate}</span>
            </div>

            {result.certificateId && (
              <div className="attendance-detail-cert">
                <span className="attendance-detail-label">Certificate Reference ID</span>
                <div className="attendance-cert-code-box">
                  <code>{result.certificateId}</code>
                  <button
                    type="button"
                    onClick={handleCopyCertificate}
                    className="attendance-copy-btn"
                    title="Copy Certificate ID"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="attendance-success-actions">
            {result.certificateId && (
              <Link
                className="attendance-action-btn attendance-action-btn--primary"
                href={`/download-certificate?code=${encodeURIComponent(result.certificateId)}`}
              >
                <Download size={15} />
                <span>Download Certificate (PDF)</span>
              </Link>
            )}

            {result.certificateId && (
              <Link
                className="attendance-action-btn attendance-action-btn--secondary"
                href={`/verify-certificate?code=${encodeURIComponent(result.certificateId)}`}
              >
                <ShieldCheck size={15} />
                <span>Verify Authenticity</span>
              </Link>
            )}

            <button
              type="button"
              onClick={resetCheckin}
              className="attendance-action-btn attendance-action-btn--ghost"
            >
              <RefreshCw size={13} />
              <span>Mark for another attendee</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Verification Input Form ──────────────────────────────────────────────
  return (
    <form ref={formRef} action={submit} className="attendance-checkin-form">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 6000,
          style: {
            background: '#090d16',
            color: '#f1f5f9',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(16, 185, 129, 0.2)',
            fontSize: '14px',
            fontWeight: '500',
          },
        }}
      />
      {sessionId ? <input type="hidden" name="sessionId" value={sessionId} /> : null}

      <div className="cms-form-group">
        <label className="attendance-checkin-label">
          <span className="flex items-center gap-1.5 font-medium">
            <User size={14} className="text-blue-400" />
            <span>Full Name</span>
            <strong className="text-red-400">*</strong>
          </span>
          <input
            autoComplete="name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={200}
            placeholder="e.g. Shanyan Ahmed"
            className="attendance-checkin-input"
          />
        </label>
        <small className="text-xs text-ink-muted">Enter the name you provided during session registration.</small>
      </div>

      <div className="cms-form-group" style={{ marginTop: '12px' }}>
        <label className="attendance-checkin-label">
          <span className="flex items-center gap-1.5 font-medium">
            <Mail size={14} className="text-blue-400" />
            <span>Registered Email</span>
            <strong className="text-red-400">*</strong>
          </span>
          <input
            autoComplete="email"
            name="email"
            type="email"
            required
            maxLength={254}
            placeholder="e.g. you@example.com"
            className="attendance-checkin-input"
          />
        </label>
        <small className="text-xs text-ink-muted">We will verify both your name and email against the synced registrant roster.</small>
      </div>

      {result && !result.success ? (
        <div className="attendance-result-wrap" style={{ marginTop: '14px' }}>
          <p role="alert" className="attendance-result attendance-result--error">
            <CircleAlert size={17} className="shrink-0" />
            <span>{result.message}</span>
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        className="attendance-checkin-submit"
        disabled={pending}
        style={{ marginTop: '16px' }}
      >
        {pending ? <LoaderCircle size={16} className="attendance-spin" /> : <CheckCircle2 size={16} />}
        {pending ? 'Verifying with platform records…' : 'Verify & Mark Attendance'}
      </button>
    </form>
  )
}
