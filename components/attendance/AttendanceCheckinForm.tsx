'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react'

type SubmissionResult = {
  success: boolean
  message: string
  code?: string
  certificateId?: string
}

export default function AttendanceCheckinForm({ sessionId }: { sessionId?: string }) {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function submit(formData: FormData) {
    setPending(true)
    setResult(null)
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          sessionId: formData.get('sessionId') || sessionId || undefined,
        }),
      })
      const payload = await response.json() as SubmissionResult
      setResult(payload)
      if (payload.success) formRef.current?.reset()
    } catch {
      setResult({ success: false, message: 'Attendance could not be verified. Please try again.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <form ref={formRef} action={submit} className="attendance-checkin-form">
      {sessionId ? <input type="hidden" name="sessionId" value={sessionId} /> : null}
      <label className="attendance-checkin-label">
        <span>Email address</span>
        <input autoComplete="email" name="email" type="email" required maxLength={254} placeholder="you@example.com" />
      </label>
      {result ? (
        <div className="attendance-result-wrap">
          <p role={result.success ? 'status' : 'alert'} className={result.success ? 'attendance-result attendance-result--success' : 'attendance-result attendance-result--error'}>
            {result.success ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
            <span>{result.message}</span>
          </p>
          {result.success && result.certificateId ? (
            <Link className="attendance-certificate-link" href={`/download-certificate?code=${encodeURIComponent(result.certificateId)}`}>
              Open your certificate <ArrowRight size={15} />
            </Link>
          ) : null}
        </div>
      ) : null}
      <button type="submit" className="attendance-checkin-submit" disabled={pending}>
        {pending ? <LoaderCircle size={16} className="attendance-spin" /> : <CheckCircle2 size={16} />}
        {pending ? 'Verifying…' : 'Verify attendance'}
      </button>
    </form>
  )
}
