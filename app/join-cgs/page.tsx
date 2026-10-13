'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDashed,
  GraduationCap,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { COUNTRY_CODES, joinPage, org } from '@/data/site'
import Container from '@/components/ui/Container'
import { ChipGroup, Field, FileDrop, RadioCards, SelectField } from '@/components/ui/FormControls'
import AnimatedProgressBar from '@/components/smoothui/components/animated-progress-bar'
import AnimatedNumberInput from '@/components/smoothui/components/animated-number-input'
import AnimatedStepper from '@/components/smoothui/components/animated-stepper'
import SmoothButton from '@/components/smoothui/components/smooth-button'

const CV_MAX_BYTES = 5 * 1024 * 1024

const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' })
const COUNTRIES = COUNTRY_CODES.map((code) => ({
  code,
  name: REGION_NAMES.of(code) ?? code,
})).sort((a, b) => a.name.localeCompare(b.name))

type FormState = {
  fullName: string
  preferredName: string
  email: string
  phone: string
  country: string
  city: string
  currentStatus: string
  institution: string
  degree: string
  currentYear: string
  linkedin: string
  github: string
  portfolio: string
  divisions: string[]
  primaryDivision: string
  otherDivision: string
  skills: string[]
  otherSkill: string
  skillLevel: string
  yearsExperience: string
  previousExperience: string
  projects: string
  certifications: string
  cyberAreas: string[]
  otherCyberArea: string
  declarations: string[]
  cv: File | null
}

const emptyForm: FormState = {
  fullName: '',
  preferredName: '',
  email: '',
  phone: '',
  country: '',
  city: '',
  currentStatus: '',
  institution: '',
  degree: '',
  currentYear: '',
  linkedin: '',
  github: '',
  portfolio: '',
  divisions: [],
  primaryDivision: '',
  otherDivision: '',
  skills: [],
  otherSkill: '',
  skillLevel: '',
  yearsExperience: '',
  previousExperience: '',
  projects: '',
  certifications: '',
  cyberAreas: [],
  otherCyberArea: '',
  declarations: [],
  cv: null,
}

/** The live checklist that drives both the progress bar and the sidebar. */
const checklist = [
  {
    id: 'identity',
    title: 'Personal information',
    icon: UserRound,
    fields: ['fullName', 'email', 'phone', 'country', 'city'] as (keyof FormState)[],
  },
  {
    id: 'academic',
    title: 'Academic / professional',
    icon: GraduationCap,
    fields: ['currentStatus', 'institution'] as (keyof FormState)[],
  },
  {
    id: 'divisions',
    title: 'Divisions',
    icon: Users,
    fields: ['divisions', 'primaryDivision'] as (keyof FormState)[],
  },
  {
    id: 'skills',
    title: 'Skills & experience',
    icon: BriefcaseBusiness,
    fields: ['skills', 'skillLevel'] as (keyof FormState)[],
  },
  {
    id: 'agreement',
    title: 'Agreement',
    icon: ShieldCheck,
    fields: ['declarations'] as (keyof FormState)[],
  },
]

const TOTAL_ITEMS = checklist.reduce((sum, section) => sum + section.fields.length, 0)

/** Tweens the displayed percentage toward the real completion value. */
function useCountUp(target: number) {
  const [value, setValue] = useState(0)
  const frame = useRef<number | null>(null)
  const origin = useRef(0)

  useEffect(() => {
    const start = performance.now()
    const from = origin.current
    const delta = target - from
    const tick = (now: number) => {
      const t = Math.min((now - start) / 500, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      origin.current = from + delta * eased
      setValue(Math.round(from + delta * eased))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [target])

  return value
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFieldError(key: string, form: FormState): string | undefined {
  switch (key) {
    case 'fullName':
      return form.fullName.trim() ? undefined : 'Add your full name.'
    case 'email':
      if (!form.email.trim()) return 'Add your email address.'
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
        ? undefined
        : 'Enter a valid email address.'
    case 'phone':
      return form.phone.trim() ? undefined : 'Add a phone or WhatsApp number.'
    case 'country':
      return form.country ? undefined : 'Choose your country.'
    case 'city':
      return form.city.trim() ? undefined : 'Add your city.'
    case 'currentStatus':
      return form.currentStatus ? undefined : 'Choose your current status.'
    case 'institution':
      return form.institution.trim() ? undefined : 'Add your school or organization.'
    case 'linkedin':
    case 'github':
    case 'portfolio': {
      const value = form[key].trim()
      if (!value || /^https?:\/\/.+\..+/.test(value)) return undefined
      const label = key === 'linkedin' ? 'LinkedIn' : key === 'github' ? 'GitHub' : 'Portfolio'
      return `${label} needs a full URL, starting with https://.`
    }
    case 'divisions':
      return form.divisions.length ? undefined : 'Choose at least one division.'
    case 'primaryDivision':
      if (!form.primaryDivision) return 'Choose your primary division.'
      return form.divisions.includes(form.primaryDivision)
        ? undefined
        : 'Choose your primary division from the list above.'
    case 'skills':
      return form.skills.length || form.otherSkill.trim()
        ? undefined
        : 'Choose a skill or add one under Other.'
    case 'skillLevel':
      return form.skillLevel ? undefined : 'Choose your current skill level.'
    case 'declarations':
      return form.declarations.length === joinPage.declarations.length
        ? undefined
        : 'Please accept each declaration before sending your application.'
    default:
      return undefined
  }
}

export default function JoinCGSPage() {
  const reduceMotion = useReducedMotion()
  const formRef = useRef<HTMLFormElement | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ reference: string } | null>(null)
  const [cvFallback, setCvFallback] = useState<string | null>(null)

  const isCyber = form.divisions.includes('cybersecurity')

  const states = useMemo(
    () =>
      checklist.map((section) => {
        const done = section.fields.filter((key) => {
          const value = form[key]
          if (Array.isArray(value)) return value.length > 0
          return String(value ?? '').trim().length > 0
        }).length
        return {
          ...section,
          done,
          total: section.fields.length,
          complete: done === section.fields.length,
        }
      }),
    [form],
  )

  const completed = states.reduce((sum, s) => sum + s.done, 0)
  const progress = Math.round((completed / TOTAL_ITEMS) * 100)
  const displayedProgress = useCountUp(progress)

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    formRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [step, reduceMotion])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    const nextForm = { ...form, [key]: value }
    const affectedKeys = [String(key), ...(key === 'otherSkill' ? ['skills'] : [])]
    setErrors((prev) => {
      const nextErrors = { ...prev }
      for (const affectedKey of affectedKeys) {
        if (prev[affectedKey]) nextErrors[affectedKey] = getFieldError(affectedKey, nextForm) ?? ''
      }
      return nextErrors
    })
  }

  const toggleIn = (key: 'divisions' | 'skills' | 'cyberAreas' | 'declarations', value: string) => {
    const nextList = form[key].includes(value)
      ? form[key].filter((item) => item !== value)
      : [...form[key], value]
    const nextForm = { ...form, [key]: nextList }
    setForm((prev) => {
      const list = prev[key]
      return { ...prev, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] }
    })
    const affectedKeys = [key, ...(key === 'divisions' ? ['primaryDivision'] : [])]
    setErrors((prev) => {
      const nextErrors = { ...prev }
      for (const affectedKey of affectedKeys) {
        if (prev[affectedKey]) nextErrors[affectedKey] = getFieldError(affectedKey, nextForm) ?? ''
      }
      return nextErrors
    })
  }

  /* ── File handling ────────────────────────────────────────────────────── */
  const acceptCv = (file: File | null) => {
    if (!file) {
      setForm((prev) => ({ ...prev, cv: null }))
      setCvFallback(null)
      return
    }
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setForm((prev) => ({ ...prev, cv: null }))
      setCvFallback('Only PDF files are accepted for the CV. Please upload a .pdf file, or email it to us.')
      return
    }
    if (file.size > CV_MAX_BYTES) {
      setForm((prev) => ({ ...prev, cv: null }))
      setCvFallback(
        `That file is ${formatBytes(file.size)}. The CV limit is 5 MB — please compress it or email it to us.`,
      )
      return
    }
    setCvFallback(null)
    setForm((prev) => ({ ...prev, cv: file }))
  }

  /* ── Email fallback ───────────────────────────────────────────────────── */
  const mailtoHref = useMemo(() => {
    const lines = [
      'CGS Membership Application',
      '',
      `Full name: ${form.fullName || '—'}`,
      `Preferred name: ${form.preferredName || '—'}`,
      `Email: ${form.email || '—'}`,
      `Phone / WhatsApp: ${form.phone || '—'}`,
      `Country: ${form.country || '—'}`,
      `City: ${form.city || '—'}`,
      '',
      `Current status: ${form.currentStatus || '—'}`,
      `Institution / Organization: ${form.institution || '—'}`,
      `Degree / Program: ${form.degree || '—'}`,
      `Year / Semester: ${form.currentYear || '—'}`,
      `LinkedIn: ${form.linkedin || '—'}`,
      `GitHub: ${form.github || '—'}`,
      `Portfolio: ${form.portfolio || '—'}`,
      '',
      `Divisions: ${form.divisions.join(', ') || '—'}`,
      `Primary division: ${form.primaryDivision || '—'}`,
      form.otherDivision ? `Other division: ${form.otherDivision}` : '',
      `Skills: ${[...form.skills, form.otherSkill].filter(Boolean).join(', ') || '—'}`,
      `Skill level: ${form.skillLevel || '—'}`,
      `Years of experience: ${form.yearsExperience || '—'}`,
      form.previousExperience ? `Previous experience: ${form.previousExperience}` : '',
      form.projects ? `Projects: ${form.projects}` : '',
      form.certifications ? `Certifications: ${form.certifications}` : '',
      isCyber && form.cyberAreas.length
        ? `Cybersecurity areas: ${[...form.cyberAreas, form.otherCyberArea].filter(Boolean).join(', ')}`
        : '',
      '',
      'I confirm the information above is accurate and I agree to the CGS Code of Conduct.',
    ].filter(Boolean)
    return `mailto:${org.email}?subject=${encodeURIComponent('CGS Membership Application')}&body=${encodeURIComponent(lines.join('\n'))}`
  }, [form, isCyber])

  /* ── Validation ───────────────────────────────────────────────────────── */
  const validateStep = (index: number) => {
    const next: Record<string, string> = {}
    const fieldsByStep = [
      ['fullName', 'email', 'phone', 'country', 'city'],
      ['currentStatus', 'institution', 'linkedin', 'github', 'portfolio'],
      ['divisions', 'primaryDivision', 'skills', 'skillLevel'],
      ['declarations'],
    ]
    for (const key of fieldsByStep[index] ?? []) {
      const error = getFieldError(key, form)
      if (error) next[key] = error
    }
    setErrors((prev) => ({ ...prev, ...next }))
    return Object.keys(next).length === 0
  }

  const validateField = (key: string) => {
    setErrors((prev) => ({ ...prev, [key]: getFieldError(key, form) ?? '' }))
  }

  const goNext = () => {
    if (!validateStep(step)) {
      toast.error('A few details need your attention.')
      return
    }
    setStep((prev) => Math.min(prev + 1, joinPage.steps.length - 1))
  }

  const goBack = () => setStep((prev) => Math.max(prev - 1, 0))

  const navigateToStep = (target: number) => {
    if (target <= step) {
      setStep(target)
      return
    }
    for (let current = step; current < target; current += 1) {
      if (!validateStep(current)) {
        toast.error('Please finish this step first.')
        return
      }
    }
    setStep(target)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    for (let i = 0; i < joinPage.steps.length; i++) {
      if (!validateStep(i)) {
        setStep(i)
        toast.error('A few details need your attention.')
        return
      }
    }

    const body = new FormData()
    body.append('fullName', form.fullName)
    body.append('preferredName', form.preferredName)
    body.append('email', form.email)
    body.append('phone', form.phone)
    body.append('country', form.country)
    body.append('city', form.city)
    body.append('currentStatus', form.currentStatus)
    body.append('institution', form.institution)
    body.append('degree', form.degree)
    body.append('currentYear', form.currentYear)
    body.append('linkedin', form.linkedin)
    body.append('github', form.github)
    body.append('portfolio', form.portfolio)
    body.append('divisions', form.divisions.join('|'))
    body.append('primaryDivision', form.primaryDivision)
    body.append('otherDivision', form.otherDivision)
    body.append('skills', form.skills.join('|'))
    body.append('otherSkill', form.otherSkill)
    body.append('skillLevel', form.skillLevel)
    body.append('yearsExperience', form.yearsExperience)
    body.append('previousExperience', form.previousExperience)
    body.append('projects', form.projects)
    body.append('certifications', form.certifications)
    body.append('cyberAreas', form.cyberAreas.join('|'))
    body.append('otherCyberArea', form.otherCyberArea)
    body.append('declarations', form.declarations.join('|'))
    if (form.cv) body.append('cv', form.cv)

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/join-application', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'CV_NOT_PDF' || data.code === 'CV_TOO_LARGE') {
          setCvFallback(data.error)
          setStep(0)
          toast.error(data.error)
          return
        }
        if (data.errors) setErrors(data.errors)
        throw new Error(data.error || 'Submission failed')
      }
      setResult({ reference: data.reference })
      toast.success('Application received')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepMeta = [
    { title: 'Personal', icon: UserRound },
    { title: 'Academic', icon: GraduationCap },
    { title: 'Divisions', icon: Users },
    { title: 'Agreement', icon: ShieldCheck },
  ]

  const fieldError = (key: string) => errors[key]

  return (
    <main id="main" className="section--tight pb-20 pt-10 sm:pt-14 hero-world-map">
      <Container>
        {/* ── Header + live progress ─────────────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
          <div className="lg:col-span-7">
            <p className="eyebrow">{joinPage.eyebrow}</p>
            <h1 className="mt-4 max-w-[20ch] font-heading text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              {joinPage.headline}
            </h1>
            <p className="mt-3 max-w-xl text-ink-muted">{joinPage.sub}</p>
          </div>

          <div className="lg:col-span-5">
            <div className="card-surface p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Live progress
                  </p>
                </div>
                <p className="font-display text-2xl font-semibold text-mint">{displayedProgress}%</p>
              </div>

              <AnimatedProgressBar
                value={displayedProgress}
                ariaLabel="Application completion"
                className="mt-4"
                barClassName="bg-linear-to-r from-mint-dim to-mint"
              />

              <ul className="mt-5 space-y-2.5">
                {states.map((section) => {
                  const Icon = section.complete ? CheckCircle2 : CircleDashed
                  return (
                    <li key={section.id} className="flex items-center gap-2.5 text-sm">
                      <Icon
                        size={15}
                        className={section.complete ? 'shrink-0 text-mint' : 'shrink-0 text-ink-muted'}
                      />
                      <span className={section.complete ? 'text-ink' : 'text-ink-muted'}>
                        {section.title}
                      </span>
                      <span className="ml-auto text-[11px] text-ink-muted">
                        {section.done}/{section.total}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Success ───────────────────────────────────────────────── */}
        {result ? (
          <div className="card-surface mt-10 p-8 sm:p-10">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-on-mint">
              <CheckCircle2 size={24} />
            </span>
            <p className="eyebrow mt-6">{joinPage.successLabel}</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em]">
              {joinPage.success.title}
            </h2>
            <p className="mt-2 max-w-[58ch] text-sm text-ink-muted">{joinPage.success.body}</p>

            <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-line bg-bg px-4 py-3">
              <span className="text-xs uppercase tracking-[0.14em] text-ink-muted">Reference</span>
              <span className="text-sm font-semibold text-mint">{result.reference}</span>
            </div>

            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {joinPage.success.next.map((item, i) => (
                <li key={item} className="rounded-card border border-line bg-bg p-4">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-mint text-xs font-bold text-on-mint">
                    {i + 1}
                  </span>
                  <p className="mt-3 text-sm text-ink-muted">{item}</p>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-wrap gap-3">
              <SmoothButton asChild color="accent" variant="solid">
                <Link href="/">Back to home</Link>
              </SmoothButton>
              <SmoothButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setForm(emptyForm)
                  setResult(null)
                  setStep(0)
                }}
              >
                {joinPage.success.again}
              </SmoothButton>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-8">
            <form ref={formRef} onSubmit={handleSubmit} noValidate className="scroll-mt-28 lg:col-span-7">
              {/* ── Stepper ────────────────────────────────────────────── */}
              <div className="card-surface mb-6 p-3">
                <div className="flex items-center justify-between gap-3 px-1 pb-3">
                  <p className="text-[13px] font-semibold">
                    Step {step + 1} of {joinPage.steps.length}
                    <span className="font-normal text-ink-muted">
                      {' '}
                      · {stepMeta[step].title}
                    </span>
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                    {completed}/{TOTAL_ITEMS} done
                  </p>
                </div>
                <AnimatedStepper
                  variant="horizontal"
                  currentStep={step}
                  allowClickNavigation
                  onStepChange={navigateToStep}
                  steps={stepMeta.map(({ title, icon: Icon }) => ({
                    label: title,
                    icon: <Icon size={14} />,
                  }))}
                />
              </div>

              {/* ── Step 1 · Personal ─────────────────────────────────── */}
              {step === 0 ? (
                <section className="card-surface p-6 sm:p-8" aria-label="Personal information">
                  <div className="flex items-start gap-3.5 border-b border-line pb-6">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-on-mint">
                      <UserRound size={20} />
                    </span>
                    <div>
                      <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">
                        01 · Personal information
                      </h2>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        How we reach you. {joinPage.requiredNote}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    <Field label="Full name" htmlFor="fullName" required error={fieldError('fullName')} onBlur={() => validateField('fullName')}>
                      <input
                        id="fullName"
                        name="fullName"
                        value={form.fullName}
                        onChange={(e) => set('fullName', e.target.value)}
                        className="field"
                        placeholder="Your full name"
                        autoComplete="name"
                      />
                    </Field>
                    <Field label="Preferred name" htmlFor="preferredName">
                      <input
                        id="preferredName"
                        name="preferredName"
                        value={form.preferredName}
                        onChange={(e) => set('preferredName', e.target.value)}
                        className="field"
                        placeholder="Preferred name (optional)"
                      />
                    </Field>
                    <Field label="Email address" htmlFor="email" required error={fieldError('email')} onBlur={() => validateField('email')}>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        className="field"
                        placeholder="Email address"
                        autoComplete="email"
                      />
                    </Field>
                    <Field label="Phone / WhatsApp number" htmlFor="phone" required error={fieldError('phone')} onBlur={() => validateField('phone')}>
                      <input
                        id="phone"
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={(e) => set('phone', e.target.value)}
                        className="field"
                        placeholder="Phone or WhatsApp number"
                        autoComplete="tel"
                      />
                    </Field>
                    <SelectField
                      id="country"
                      label="Country"
                      required
                      error={fieldError('country')}
                      onBlur={() => validateField('country')}
                      value={form.country}
                      onChange={(v) => set('country', v)}
                      options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
                      placeholder="Select your country"
                    />
                    <Field label="City" htmlFor="city" required error={fieldError('city')} onBlur={() => validateField('city')}>
                      <input
                        id="city"
                        name="city"
                        value={form.city}
                        onChange={(e) => set('city', e.target.value)}
                        className="field"
                        placeholder="City"
                        autoComplete="address-level2"
                      />
                    </Field>
                  </div>

                  <div className="mt-6">
                    <FileDrop
                      id="cv"
                      label={joinPage.uploads.cv.label}
                      hint={joinPage.uploads.cv.hint}
                      accept=".pdf,application/pdf"
                      file={form.cv}
                      onFile={acceptCv}
                      error={cvFallback}
                      formatBytes={formatBytes}
                      disabled={isSubmitting}
                    />
                    {cvFallback ? (
                      <div className="mt-4 rounded-card border border-line bg-bg p-5">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-brass" />
                          <div>
                            <p className="text-sm font-semibold">{joinPage.emailFallback.title}</p>
                            <p className="mt-1 text-xs leading-5 text-ink-muted">
                              {joinPage.emailFallback.body}
                            </p>
                            <SmoothButton asChild size="sm" className="mt-4" prefix={<Mail size={14} />}>
                              <a href={mailtoHref}>{joinPage.emailFallback.cta}</a>
                            </SmoothButton>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {/* ── Step 2 · Academic ─────────────────────────────────── */}
              {step === 1 ? (
                <section className="card-surface p-6 sm:p-8" aria-label="Academic and professional information">
                  <div className="flex items-start gap-3.5 border-b border-line pb-6">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-on-mint">
                      <GraduationCap size={20} />
                    </span>
                    <div>
                      <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">
                        02 · Academic / professional information
                      </h2>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        Your current status and where you work or study.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    <SelectField
                      id="currentStatus"
                      label="Current status"
                      required
                      error={fieldError('currentStatus')}
                      onBlur={() => validateField('currentStatus')}
                      value={form.currentStatus}
                      onChange={(v) => set('currentStatus', v)}
                      options={joinPage.statusOptions}
                      placeholder="Select your status"
                    />
                    <SelectField
                      id="currentYear"
                      label="Current year / semester"
                      value={form.currentYear}
                      onChange={(v) => set('currentYear', v)}
                      options={joinPage.yearOptions}
                      placeholder="Select year or semester"
                    />
                    <Field
                      label="Institution / University / Organization"
                      htmlFor="institution"
                      required
                      error={fieldError('institution')}
                      onBlur={() => validateField('institution')}
                    >
                      <input
                        id="institution"
                        name="institution"
                        value={form.institution}
                        onChange={(e) => set('institution', e.target.value)}
                        className="field"
                        placeholder="Institution or organization"
                      />
                    </Field>
                    <Field label="Degree / Program" htmlFor="degree">
                      <input
                        id="degree"
                        name="degree"
                        value={form.degree}
                        onChange={(e) => set('degree', e.target.value)}
                        className="field"
                        placeholder="Degree or program"
                      />
                    </Field>
                    <Field label="LinkedIn profile" htmlFor="linkedin" error={fieldError('linkedin')} hint="Optional" onBlur={() => validateField('linkedin')}>
                      <input
                        id="linkedin"
                        name="linkedin"
                        value={form.linkedin}
                        onChange={(e) => set('linkedin', e.target.value)}
                        className="field"
                        placeholder="LinkedIn profile URL"
                        inputMode="url"
                      />
                    </Field>
                    <Field label="GitHub profile" htmlFor="github" error={fieldError('github')} hint="Optional" onBlur={() => validateField('github')}>
                      <input
                        id="github"
                        name="github"
                        value={form.github}
                        onChange={(e) => set('github', e.target.value)}
                        className="field"
                        placeholder="GitHub profile URL"
                        inputMode="url"
                      />
                    </Field>
                    <Field
                      label="Portfolio / Personal website"
                      htmlFor="portfolio"
                      error={fieldError('portfolio')}
                      hint="Optional"
                      className="sm:col-span-2"
                      onBlur={() => validateField('portfolio')}
                    >
                      <input
                        id="portfolio"
                        name="portfolio"
                        value={form.portfolio}
                        onChange={(e) => set('portfolio', e.target.value)}
                        className="field"
                        placeholder="Portfolio URL"
                        inputMode="url"
                      />
                    </Field>
                  </div>
                </section>
              ) : null}

              {/* ── Step 3 · Divisions, skills & experience ───────────── */}
              {step === 2 ? (
                <section className="card-surface p-6 sm:p-8" aria-label="Divisions, skills and experience">
                  <div className="flex items-start gap-3.5 border-b border-line pb-6">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-on-mint">
                      <Users size={20} />
                    </span>
                    <div>
                      <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">
                        03 · Divisions, skills & experience
                      </h2>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        Choose everything you want to contribute to.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-sm text-ink-muted">
                      Which CGS divisions are you interested in? <span className="text-mint">*</span>
                    </p>
                    <div className="mt-3">
                      <ChipGroup
                        options={joinPage.divisions}
                        selected={form.divisions}
                        onToggle={(v) => toggleIn('divisions', v)}
                      />
                    </div>
                    {fieldError('divisions') ? (
                      <span className="mt-2 block text-xs text-error">{fieldError('divisions')}</span>
                    ) : null}
                    {form.divisions.includes('other') ? (
                      <div className="mt-3">
                        <Field label="Tell us the division you have in mind" htmlFor="otherDivision">
                          <input
                            id="otherDivision"
                            name="otherDivision"
                            value={form.otherDivision}
                            onChange={(e) => set('otherDivision', e.target.value)}
                            className="field"
                            placeholder="Describe your preferred division"
                          />
                        </Field>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-7">
                    <p className="text-sm text-ink-muted">
                      Primary division <span className="text-mint">*</span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Where your onboarding starts. It must be one of the divisions you selected.
                    </p>
                    <div className="mt-3">
                      <RadioCards
                        name="primaryDivision"
                        options={form.divisions
                          .map((value) => joinPage.divisions.find((d) => d.value === value))
                          .filter((d): d is (typeof joinPage.divisions)[number] => Boolean(d))}
                        value={form.primaryDivision}
                        onChange={(v) => set('primaryDivision', v)}
                        columns="sm:grid-cols-2"
                      />
                    </div>
                    {fieldError('primaryDivision') ? (
                      <span className="mt-2 block text-xs text-error">{fieldError('primaryDivision')}</span>
                    ) : null}
                  </div>

                  <div className="mt-7 border-t border-line pt-7">
                    <p className="text-sm text-ink-muted">
                      What skills do you currently have? <span className="text-mint">*</span>
                    </p>
                    <div className="mt-3">
                      <ChipGroup
                        options={joinPage.skills.map((s) => ({ value: s, label: s }))}
                        selected={form.skills}
                        onToggle={(v) => toggleIn('skills', v)}
                      />
                    </div>
                    <div className="mt-3">
                      <Field label="Other skill" htmlFor="otherSkill" hint="Anything not listed above">
                        <input
                          id="otherSkill"
                          name="otherSkill"
                          value={form.otherSkill}
                          onChange={(e) => set('otherSkill', e.target.value)}
                          className="field"
                          placeholder="List your relevant skills"
                        />
                      </Field>
                    </div>
                    {fieldError('skills') ? (
                      <span className="mt-2 block text-xs text-error">{fieldError('skills')}</span>
                    ) : null}
                  </div>

                  <div className="mt-7 border-t border-line pt-7">
                    <p className="text-sm text-ink-muted">
                      Skill level <span className="text-mint">*</span>
                    </p>
                    <div className="mt-3">
                      <RadioCards
                        name="skillLevel"
                        options={joinPage.skillLevels.map((l) => ({ value: l, label: l }))}
                        value={form.skillLevel}
                        onChange={(v) => set('skillLevel', v)}
                        columns="sm:grid-cols-3"
                      />
                    </div>
                    {fieldError('skillLevel') ? (
                      <span className="mt-2 block text-xs text-error">{fieldError('skillLevel')}</span>
                    ) : null}
                    <div className="mt-5">
                      <AnimatedNumberInput
                        label="Years of experience"
                        value={form.yearsExperience === '' ? null : Number(form.yearsExperience)}
                        onValueChange={(value) => set('yearsExperience', value === null ? '' : String(value))}
                        min={0}
                        precision={0}
                        allowEmpty
                        stepper
                        suffix="yrs"
                      />
                      <span className="mt-1.5 block text-xs text-ink-muted">Optional</span>
                    </div>
                  </div>

                  <div className="mt-7 grid gap-5">
                    <Field label="Previous experience" htmlFor="previousExperience" hint="Optional">
                      <textarea
                        id="previousExperience"
                        name="previousExperience"
                        value={form.previousExperience}
                        onChange={(e) => set('previousExperience', e.target.value)}
                        className="field min-h-24 resize-y"
                        placeholder="Describe your previous experience"
                      />
                    </Field>
                    <Field label="Projects you've worked on" htmlFor="projects" hint="Optional">
                      <textarea
                        id="projects"
                        name="projects"
                        value={form.projects}
                        onChange={(e) => set('projects', e.target.value)}
                        className="field min-h-24 resize-y"
                        placeholder="Describe projects you have worked on"
                      />
                    </Field>
                    <Field label="Certifications / achievements" htmlFor="certifications" hint="Optional">
                      <textarea
                        id="certifications"
                        name="certifications"
                        value={form.certifications}
                        onChange={(e) => set('certifications', e.target.value)}
                        className="field min-h-24 resize-y"
                        placeholder="List relevant certifications or achievements"
                      />
                    </Field>
                  </div>

                  {/* Cybersecurity-specific block */}
                  {isCyber ? (
                    <div className="mt-7 rounded-card border border-line bg-surface p-5">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">🛡️</span>
                        <p className="text-sm font-semibold">Cybersecurity areas of interest</p>
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        Shown because you picked Cybersecurity / Technical. Optional.
                      </p>
                      <div className="mt-4">
                        <ChipGroup
                          options={joinPage.cyberAreas.map((a) => ({ value: a, label: a }))}
                          selected={form.cyberAreas}
                          onToggle={(v) => toggleIn('cyberAreas', v)}
                        />
                      </div>
                      <div className="mt-4">
                        <Field label="Other area" htmlFor="otherCyberArea">
                          <input
                            id="otherCyberArea"
                            name="otherCyberArea"
                            value={form.otherCyberArea}
                            onChange={(e) => set('otherCyberArea', e.target.value)}
                            className="field"
                            placeholder="Describe another cybersecurity area"
                          />
                        </Field>
                      </div>
                    </div>
                  ) : null}

                </section>
              ) : null}

              {/* ── Step 4 · Agreement ────────────────────────────────── */}
              {step === 3 ? (
                <section className="card-surface p-6 sm:p-8" aria-label="Agreement and declaration">
                  <div className="flex items-start gap-3.5 border-b border-line pb-6">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-on-mint">
                      <ShieldCheck size={20} />
                    </span>
                    <div>
                      <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">
                        04 · Agreement & declaration
                      </h2>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        Four confirmations that make your onboarding official.
                      </p>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {joinPage.declarations.map((declaration) => {
                      const checked = form.declarations.includes(declaration.id)
                      return (
                        <li key={declaration.id}>
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-card border p-4 transition-all duration-150 ${
                              checked
                                ? 'border-mint bg-bg'
                                : 'border-line bg-bg hover:border-mint'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 accent-(--mint)"
                              checked={checked}
                              onChange={() => toggleIn('declarations', declaration.id)}
                            />
                            <span className="flex-1 text-sm text-ink-muted">
                              {declaration.label}{' '}
                              <span className="text-mint">*</span>
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                  {fieldError('declarations') ? (
                    <span className="mt-3 block text-xs text-error">{fieldError('declarations')}</span>
                  ) : null}

                  <div className="mt-7 rounded-card border border-line bg-bg p-5">
                    <h3 className="text-sm font-semibold">Review before you submit</h3>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        { term: 'Applicant', value: form.fullName || '—' },
                        {
                          term: 'Email',
                          value: form.email || '—',
                        },
                        { term: 'Phone', value: form.phone || '—' },
                        {
                          term: 'Location',
                          value: [form.city, COUNTRIES.find((c) => c.code === form.country)?.name]
                            .filter(Boolean)
                            .join(', ') || '—',
                        },
                        { term: 'Status', value: form.currentStatus || '—' },
                        { term: 'Institution', value: form.institution || '—' },
                        {
                          term: 'Divisions',
                          value: form.divisions.length
                            ? `${form.divisions.length} selected · ${joinPage.divisions.find((d) => d.value === form.primaryDivision)?.label ?? 'no primary'}`
                            : '—',
                        },
                        { term: 'Skill level', value: form.skillLevel || '—' },
                        {
                          term: 'CV',
                          value: form.cv ? `${form.cv.name} (${formatBytes(form.cv.size)})` : 'Not attached',
                        },
                      ].map((row) => (
                        <div key={row.term} className="min-w-0">
                          <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                            {row.term}
                          </dt>
                          <dd className="mt-0.5 truncate text-sm">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </section>
              ) : null}

              {/* ── Navigation ─────────────────────────────────────────── */}
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <SmoothButton
                  type="button"
                    variant="outline"
                    color="neutral"
                  onClick={goBack}
                  disabled={step === 0}
                    prefix={<ArrowLeft size={15} />}
                  className={step === 0 ? 'invisible' : ''}
                >
                  Back
                  </SmoothButton>

                <div className="flex items-center gap-4">
                  <p className="flex items-center gap-2 text-xs text-ink-muted">
                    <Sparkles size={14} className="shrink-0 text-mint" />
                    {completed} of {TOTAL_ITEMS} required items
                  </p>
                  {step < joinPage.steps.length - 1 ? (
                    <SmoothButton type="button" color="accent" variant="solid" onClick={goNext} suffix={<ArrowRight size={15} />}>
                      Save and continue
                    </SmoothButton>
                  ) : (
                    <SmoothButton type="submit" color="accent" variant="solid" loading={isSubmitting} prefix={<ShieldCheck size={15} />}>
                      {isSubmitting ? 'Sending…' : 'Send my application'}
                    </SmoothButton>
                  )}
                </div>
              </div>
            </form>

            {/* ── Sidebar ────────────────────────────────────────────── */}
            <aside className="space-y-4 lg:col-span-5">
              <div className="card-surface p-6 lg:sticky lg:top-28">
                <h2 className="font-display text-lg font-semibold tracking-[-0.02em]">
                  What happens next
                </h2>

                <ol className="mt-5 space-y-4">
                  {joinPage.nextSteps.map((item, i) => (
                    <li key={item.title} className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint text-xs font-bold text-on-mint">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-ink-muted">{item.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-6 rounded-card border border-line bg-bg p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      Your progress
                    </p>
                    <span className="font-display text-lg font-semibold text-mint">
                      {displayedProgress}%
                    </span>
                  </div>
                  <AnimatedProgressBar
                    value={displayedProgress}
                    ariaLabel="Application completion"
                    className="mt-3"
                    trackClassName="h-1.5 rounded-full border-0"
                    barClassName="rounded-full bg-mint"
                  />
                  <p className="mt-3 text-xs text-ink-muted">
                    {completed} of {TOTAL_ITEMS} required items completed. You can jump back to any
                    finished section above.
                  </p>
                </div>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="flex items-start gap-2 text-xs leading-5 text-ink-muted">
                    <ShieldCheck size={14} className="mt-0.5 shrink-0 text-mint" />
                    Your CV is stored in a private bucket only the CGS admin team can open.
                  </p>
                  <p className="mt-4 text-sm text-ink-muted">
                    Questions first?{' '}
                    <Link href={org.contactHref} className="font-semibold text-mint hover:underline">
                      Contact us
                    </Link>
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </Container>
    </main>
  )
}
