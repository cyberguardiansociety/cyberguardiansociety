'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, LoaderCircle, Mic2 } from 'lucide-react'

export default function SpeakerApplicationForm() {
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setPending(true)
    setError('')
    const form = new FormData(formElement)
    const name = String(form.get('name') ?? '').trim()
    const email = String(form.get('email') ?? '').trim()
    const expertise = String(form.get('expertise') ?? '').trim()
    const sessionTitle = String(form.get('sessionTitle') ?? '').trim()
    const preferredPlatform = String(form.get('preferredPlatform') ?? '').trim()
    const summary = String(form.get('summary') ?? '').trim()
    const message = [
      'Topic: Join as a speaker',
      `Expertise: ${expertise}`,
      `Proposed session: ${sessionTitle}`,
      `Prefered Session Platform: ${preferredPlatform}`,
      '',
      summary,
    ].join('\n')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          source: 'speaker-application',
          metadata: {
            source: 'speaker-application',
            expertise,
            session_title: sessionTitle,
            preferred_session_platform: preferredPlatform,
          },
        }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'We couldn’t send your speaker application.')
      setSent(true)
      formElement.reset()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We couldn’t send your application. Please try again.')
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div className="speaker-success" role="status">
        <CheckCircle2 size={22} />
        <div>
          <h2>Thanks for raising your hand.</h2>
          <p>Your proposal is in the CGS admin inbox. The team will follow up by email.</p>
        </div>
      </div>
    )
  }

  return (
    <form className="speaker-application-form" onSubmit={submit}>
      <div className="speaker-form-heading">
        <span><Mic2 size={18} /></span>
        <div>
          <p className="eyebrow">Speaker proposal</p>
          <h2>Pitch a session</h2>
        </div>
      </div>
      <div className="speaker-form-grid">
        <label>Name<input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>Area of expertise<input name="expertise" required minLength={2} maxLength={100} placeholder="e.g. incident response" /></label>
        <label>Proposed session title<input name="sessionTitle" required minLength={4} maxLength={150} /></label>
        <label>Prefered Session Platform<input name="preferredPlatform" required minLength={2} maxLength={100} placeholder="e.g. Google Meet, Zoom, Teams, Discord" /></label>
        <label className="speaker-form-grid__wide">What would attendees learn?
          <textarea name="summary" required minLength={20} maxLength={500} rows={5} />
        </label>
      </div>
      {error ? <p className="speaker-form-error" role="alert">{error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="certificate-spinner" size={16} /> : <ArrowRight size={16} />}
        {pending ? 'Sending proposal…' : 'Send my proposal'}
      </button>
      <p className="speaker-form-note">We review every proposal. Please don’t include confidential client or incident details.</p>
    </form>
  )
}