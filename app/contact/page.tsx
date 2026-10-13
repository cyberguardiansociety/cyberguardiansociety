'use client'

import { useState } from 'react'
import { AtSign, Building2, CheckCircle2, Clock3, Mail, MapPin, Phone, Send, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { contactPage, org } from '@/data/site'
import { SectionLabel } from '@/components/ui/PageChrome'
import Container from '@/components/ui/Container'
import ClayButton from '@/components/ui/ClayButton'
import { SelectField } from '@/components/ui/FormControls'
import { WhatsAppIcon } from '@/components/ui/SocialIcons'
import ButtonCopy from '@/components/smoothui/components/button-copy'

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Fall through to the legacy clipboard path when permission is denied.
    }
  }

  const input = document.createElement('textarea')
  input.value = value
  input.setAttribute('readonly', '')
  input.setAttribute('aria-hidden', 'true')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  let copied = false
  try {
    copied = document.execCommand('copy')
  } finally {
    input.remove()
  }

  if (!copied) throw new Error('Clipboard copy failed')
}

const detailIconMap = {
  map: MapPin,
  phone: Phone,
  mail: Mail,
  whatsapp: WhatsAppIcon,
  community: AtSign,
  hours: Clock3,
} as const

type FormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  organization: string
  role: string
  country: string
  topic: string
  message: string
}

type FieldErrors = Partial<Record<keyof FormState, string>>

const initialForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  organization: '',
  role: '',
  country: '',
  topic: '',
  message: '',
}

const MESSAGE_LIMIT = 1200

/** Returns a human-readable error for a single field, or undefined if valid. */
function validateField(name: keyof FormState, value: string): string | undefined {
  if (name === 'firstName' && !value.trim()) return 'What should we call you?'
  if (name === 'lastName' && !value.trim()) return 'Your last name helps us address you properly.'
  if (name === 'email') {
    if (!value.trim()) return 'We need an email to reply to you.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'That doesn\'t look like a valid email.'
  }
  if (name === 'message' && value.trim().length < 20) return 'Tell us a bit more — 20 characters minimum.'
  return undefined
}

function validateForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {}
  for (const [key, value] of Object.entries(form)) {
    const error = validateField(key as keyof FormState, value)
    if (error) errors[key as keyof FormState] = error
  }
  return errors
}

export default function ContactPage() {
  const c = contactPage
  const whatsappHref = `https://wa.me/${org.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hello CGS, I have a question.')}`
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)

  // Validate a single field the moment the user leaves it
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const fieldName = name as keyof FormState
    setTouched((prev) => ({ ...prev, [fieldName]: true }))
    const error = validateField(fieldName, value)
    setErrors((prev) => ({ ...prev, [fieldName]: error }))
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    const fieldName = name as keyof FormState
    setForm((prev) => ({ ...prev, [fieldName]: value }))
    // Clear error immediately once the field has a valid value (instant feedback)
    if (touched[fieldName]) {
      const error = validateField(fieldName, value)
      setErrors((prev) => ({ ...prev, [fieldName]: error }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Mark all fields touched and show all errors at once
    const allTouched = Object.keys(form).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Record<keyof FormState, boolean>,
    )
    setTouched(allTouched)
    const nextErrors = validateForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error('A few fields need attention — scroll up to fix them.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email.trim(),
          message: [
            form.topic && `Topic: ${form.topic}`,
            form.organization && `Organization: ${form.organization}`,
            form.role && `Role: ${form.role}`,
            form.country && `Region: ${form.country}`,
            form.phone && `Phone: ${form.phone}`,
            '',
            form.message.trim(),
          ]
            .filter((line) => line !== '')
            .join('\n'),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setForm(initialForm)
      setErrors({})
      setTouched({})
      setIsSent(true)
      toast.success(data.message || c.form.successTitle)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong — please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldClass = 'field'

  return (
    <>
      <main id="main">
        {/* Contact hero section */}
        <section className="section--tight pb-8 pt-10 sm:pt-16 hero-world-map">
          <Container>
            <div className="grid gap-12 md:grid-cols-12 md:gap-10">
              {/* ── Left column: page heading + contact details ──────────── */}
              <div className="md:col-span-4">
                <div className="lg:sticky lg:top-28">
                  {/* Eyebrow tight to headline */}
                  <p className="eyebrow">{c.eyebrow}</p>
                  <h1 className="mt-3 max-w-[16ch] font-heading text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">
                    {c.headline}
                  </h1>
                  {/* Body copy — slightly more distance from headline */}
                  <p className="mt-5 max-w-[46ch] text-ink-muted">{c.body}</p>

                  {/* Response time badge — clear expectation */}
                  <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-mint bg-mint px-3.5 py-1.5 text-xs font-medium text-on-mint">
                    <CheckCircle2 size={14} />
                    {c.form.responseNote}
                  </p>

                  {/* Contact detail list — generous gap from badge */}
                  <ul className="mt-10 space-y-4">
                    {c.details.map((d) => {
                      const Icon = detailIconMap[d.icon] ?? Mail
                      const external = Boolean(d.href && d.href.startsWith('http'))
                      const copyable = d.icon === 'mail' || d.icon === 'phone'
                      return (
                        <li key={d.label} className="flex items-start gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint text-on-mint">
                            <Icon size={16} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs uppercase tracking-wider text-ink-muted">
                              {d.label}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              {d.href ? (
                                <a
                                  href={d.href}
                                  target={external ? '_blank' : undefined}
                                  rel={external ? 'noopener noreferrer' : undefined}
                                  className="min-w-0 break-all text-sm font-medium transition-colors hover:text-mint"
                                >
                                  {d.value}
                                </a>
                              ) : (
                                <span className="min-w-0 text-sm font-medium">{d.value}</span>
                              )}
                              {copyable ? (
                                <ButtonCopy
                                  label={d.icon === 'mail' ? 'email address' : 'WhatsApp number'}
                                  onCopy={() => copyToClipboard(d.value)}
                                />
                              ) : null}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>

              {/* ── Right column: form ────────────────────────────────────── */}
              <div className="md:col-span-8">
                {isSent ? (
                  <div className="card-surface flex flex-col items-start gap-6 p-8 sm:p-10">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-on-mint">
                      <ShieldCheck size={24} />
                    </span>
                    <div>
                      <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                        {c.form.successTitle}
                      </h2>
                      <p className="mt-2 text-sm text-ink-muted">{c.form.successBody}</p>
                    </div>
                    <ClayButton
                      type="button"
                      variant="secondary"
                      onClick={() => setIsSent(false)}
                    >
                      {c.form.resetLabel}
                    </ClayButton>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="card-surface p-6 sm:p-8">
                    {/* Form header */}
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
                      <div className="flex items-start gap-3.5">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-on-mint">
                          <Building2 size={20} />
                        </span>
                        <div>
                          <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">
                            {c.form.headline}
                          </h2>
                          <p className="mt-1 text-sm text-ink-muted">{c.form.body}</p>
                        </div>
                      </div>
                      <p className="rounded-full border border-line bg-bg px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                        Secure form
                      </p>
                    </div>

                    {/* ── Section 1: Who you are ────────────────────────── */}
                    <fieldset className="mt-8">
                      <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                        About you
                      </legend>
                      <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
                        {/* First name */}
                        <label className="block text-sm">
                          <span className="mb-1.5 block text-ink-muted">
                            First name <span className="text-mint" aria-hidden="true">*</span>
                          </span>
                          <input
                            name="firstName"
                            value={form.firstName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`${fieldClass}${errors.firstName ? ' border-error ring-1 ring-error' : ''}`}
                            autoComplete="given-name"
                            aria-invalid={Boolean(errors.firstName)}
                            aria-describedby={errors.firstName ? 'err-firstName' : undefined}
                            placeholder="e.g. Sarah"
                            required
                          />
                          {errors.firstName ? (
                            <span id="err-firstName" role="alert" className="mt-1.5 block text-xs text-error">
                              {errors.firstName}
                            </span>
                          ) : null}
                        </label>

                        {/* Last name */}
                        <label className="block text-sm">
                          <span className="mb-1.5 block text-ink-muted">
                            Last name <span className="text-mint" aria-hidden="true">*</span>
                          </span>
                          <input
                            name="lastName"
                            value={form.lastName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`${fieldClass}${errors.lastName ? ' border-error ring-1 ring-error' : ''}`}
                            autoComplete="family-name"
                            aria-invalid={Boolean(errors.lastName)}
                            aria-describedby={errors.lastName ? 'err-lastName' : undefined}
                            required
                          />
                          {errors.lastName ? (
                            <span id="err-lastName" role="alert" className="mt-1.5 block text-xs text-error">
                              {errors.lastName}
                            </span>
                          ) : null}
                        </label>

                        {/* Email */}
                        <label className="block text-sm">
                          <span className="mb-1.5 block text-ink-muted">
                            Your email <span className="text-mint" aria-hidden="true">*</span>
                          </span>
                          <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`${fieldClass}${errors.email ? ' border-error ring-1 ring-error' : ''}`}
                            autoComplete="email"
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? 'err-email' : undefined}
                            placeholder="you@company.com"
                            required
                          />
                          {errors.email ? (
                            <span id="err-email" role="alert" className="mt-1.5 block text-xs text-error">
                              {errors.email}
                            </span>
                          ) : null}
                        </label>

                        {/* Phone */}
                        <label className="block text-sm">
                          <span className="mb-1.5 block text-ink-muted">Phone (optional)</span>
                          <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            className="field"
                            autoComplete="tel"
                            placeholder="+1 555 000 0000"
                          />
                        </label>

                        {/* Organization */}
                        <label className="block text-sm">
                          <span className="mb-1.5 block text-ink-muted">Company or org (optional)</span>
                          <input
                            name="organization"
                            value={form.organization}
                            onChange={handleChange}
                            className="field"
                            autoComplete="organization"
                            placeholder="Where you work"
                          />
                        </label>

                        {/* Role */}
                        <label className="block text-sm">
                          <span className="mb-1.5 block text-ink-muted">Your role (optional)</span>
                          <input
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            className="field"
                            autoComplete="organization-title"
                            placeholder="e.g. Security Engineer"
                          />
                        </label>
                      </div>
                    </fieldset>

                    {/* ── Section 2: What you need ──────────────────────── */}
                    <fieldset className="mt-10 border-t border-line pt-8">
                      <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                        What you need
                      </legend>
                      <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
                        <SelectField
                          id="contact-topic"
                          label="What's this about?"
                          value={form.topic}
                          onChange={(value) => setForm((prev) => ({ ...prev, topic: value }))}
                          options={c.form.topics}
                          placeholder="Pick the closest match"
                        />
                        <SelectField
                          id="contact-region"
                          label="Your region"
                          value={form.country}
                          onChange={(value) => setForm((prev) => ({ ...prev, country: value }))}
                          options={c.form.countries}
                          placeholder="Where are you based?"
                        />
                      </div>

                      {/* Message */}
                      <label className="mt-6 block text-sm">
                        <span className="mb-1.5 flex items-baseline justify-between gap-3 text-ink-muted">
                          <span>
                            Your message <span className="text-mint" aria-hidden="true">*</span>
                          </span>
                          <span
                            className={`text-[11px] tabular-nums ${
                              form.message.length > MESSAGE_LIMIT ? 'text-error' : ''
                            }`}
                          >
                            {form.message.length}/{MESSAGE_LIMIT}
                          </span>
                        </span>
                        <textarea
                          name="message"
                          value={form.message}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          maxLength={MESSAGE_LIMIT}
                          rows={6}
                          aria-invalid={Boolean(errors.message)}
                          aria-describedby={errors.message ? 'err-message' : undefined}
                          className={`${fieldClass}${errors.message ? ' border-error ring-1 ring-error' : ''}`}
                          placeholder="Tell us what you're working on and what outcome you need."
                          required
                        />
                        {errors.message ? (
                          <span id="err-message" role="alert" className="mt-1.5 block text-xs text-error">
                            {errors.message}
                          </span>
                        ) : null}
                      </label>
                    </fieldset>

                    {/* ── Submit row ─────────────────────────────────────── */}
                    <div className="mt-8 flex flex-col gap-4 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-ink-muted sm:max-w-[42ch]">
                        {c.form.privacyNote}
                      </p>
                      <ClayButton
                        type="submit"
                        loading={isSubmitting}
                        icon={<Send size={15} />}
                        className="shrink-0"
                      >
                        {isSubmitting ? c.form.sendingLabel : c.form.submitLabel}
                      </ClayButton>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </Container>
        </section>

        {/* Office locations */}
        <section className="section--tight pb-20 border-t border-line">
          <Container>
            <SectionLabel eyebrow={c.offices.eyebrow} heading={c.offices.headline} />
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {c.offices.items.map((office) => (
                <li key={office.title} className="card-surface p-5">
                  <h3 className="font-display font-semibold">{office.title}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{office.body}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>
        <section className="section border-t border-line" aria-labelledby="headquarters-heading">
          <Container>
            <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-4">
                <p className="eyebrow">Visit CGS</p>
                <h2 id="headquarters-heading" className="mt-3 max-w-[14ch] font-heading text-3xl font-semibold sm:text-4xl">Our headquarters</h2>
                <p className="mt-4 text-sm leading-6 text-ink-muted">Nawabshah (Shaheed Benazirabad), Sindh, Pakistan.</p>
                <a className="mt-5 inline-flex text-sm font-semibold text-mint hover:underline" href="https://www.google.com/maps/dir/?api=1&destination=26.2442%2C68.4100" target="_blank" rel="noopener noreferrer">Open directions</a>
              </div>
              <div className="headquarters-map lg:col-span-8">
                <iframe
                  title="Map showing Cyber Guardian Society headquarters in Nawabshah, Pakistan"
                  src="https://www.google.com/maps?q=26.2442%2C68.4100&z=13&output=embed"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          </Container>
        </section>
      </main>

      {/* WhatsApp floating button */}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with CGS on WhatsApp"
        title="Chat with CGS on WhatsApp"
        className="fixed bottom-22 right-5 z-90 grid h-14 w-14 place-items-center rounded-full border border-line bg-mint text-on-mint shadow-panel transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <WhatsAppIcon size={27} />
      </a>
    </>
  )
}
