'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function NewsletterBand() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setStatus('error')
      setMessage('Please enter your email address.')
      return
    }

    if (!validateEmail(email)) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'team-page' }),
      })

      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; message?: string; error?: string }
        | null

      if (!res.ok || !data?.success) {
        setStatus('error')
        setMessage(data?.error || 'Something went wrong. Please try again.')
        return
      }

      setStatus('success')
      setMessage(data.message || "You're on the list! Check your inbox to confirm.")
      setEmail('')
    } catch {
      setStatus('error')
      setMessage('Network error. Please check your connection and try again.')
    }
  }

  const busy = status === 'loading' || status === 'success'

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[24px] border border-line/50 bg-surface-2/20 p-8 sm:p-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            {/* Left side: text */}
            <div className="flex-1">
              <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                Stay in the loop
              </h2>
              <p className="mt-2 text-sm text-ink-muted sm:text-base">
                CGS announcements, workshop dates, and new writeups, straight to your inbox. No spam.
              </p>
            </div>

            {/* Right side: form */}
            <div className="flex-1 sm:max-w-md">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <div className="flex rounded-full border border-line/50 bg-surface p-1">
                  <input
                    id="newsletter-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-invalid={status === 'error'}
                    aria-describedby="newsletter-status"
                    className="flex-1 bg-transparent px-4 py-2 text-sm text-ink placeholder:text-ink-muted/50 outline-none"
                    disabled={busy}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex min-h-11 items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-semibold text-on-mint transition-colors hover:bg-mint-dim disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {status === 'loading' ? (
                      <span className="animate-pulse">Subscribing...</span>
                    ) : (
                      <>
                        Subscribe
                        <Send size={14} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>

                {/* Status messages */}
                <p
                  id="newsletter-status"
                  role="status"
                  aria-live="polite"
                  className={`min-h-4 text-xs ${
                    status === 'error'
                      ? 'text-error'
                      : status === 'success'
                        ? 'text-mint'
                        : 'text-transparent'
                  }`}
                >
                  {message}
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

