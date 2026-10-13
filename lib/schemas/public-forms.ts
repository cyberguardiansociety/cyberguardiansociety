import { z } from 'zod'
import { COUNTRY_CODES, joinPage } from '@/data/site'
import { isSafeWebUrl, normalizeEmail, sanitizeText } from '@/lib/security/input-sanitizer'

// RFC 5322 simplified compliant email pattern (prevents control characters, IP literals with spaces, missing TLDs)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

// Allowed telephone pattern: allows optional '+', digits, spaces, hyphens, parens, dots (min 3, max 50 chars)
const PHONE_REGEX = /^[+]?[\d\s().-]{3,50}$/

// Valid country codes set
const VALID_COUNTRY_CODES = new Set<string>(COUNTRY_CODES)

// Valid status options from site config
const VALID_STATUS_OPTIONS = new Set<string>(joinPage.statusOptions)

// Valid year options from site config
const VALID_YEAR_OPTIONS = new Set<string>(joinPage.yearOptions)

// Valid division IDs
const VALID_DIVISION_IDS = new Set<string>(joinPage.divisions.map((d) => d.value))

// Valid skill levels
const VALID_SKILL_LEVELS = new Set<string>(['Beginner', 'Intermediate', 'Advanced'])

// Required declaration IDs
export const REQUIRED_DECLARATION_IDS = ['accuracy', 'conduct', 'commitment', 'notice'] as const

/**
 * Strict schema for Contact Us submissions (/api/contact)
 */
export const ContactSubmissionSchema = z.object({
  name: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z.string()
        .min(2, { message: 'Name must be at least 2 characters.' })
        .max(120, { message: 'Name must be 120 characters or fewer.' })
    ),
  email: z
    .string()
    .transform(normalizeEmail)
    .pipe(
      z.string()
        .min(3, { message: 'Email address is required.' })
        .max(254, { message: 'Email must be 254 characters or fewer.' })
        .regex(EMAIL_REGEX, { message: 'Please enter a valid email address.' })
    ),
  message: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z.string()
        .min(20, { message: 'Message must be at least 20 characters.' })
        .max(1200, { message: 'Message must be 1200 characters or fewer.' })
    ),
  source: z
    .enum(['contact-form', 'speaker-application'] as const)
    .default('contact-form'),
  metadata: z
    .object({
      source: z.string().max(50).optional(),
      expertise: z.string().max(100).optional(),
      session_title: z.string().max(150).optional(),
      preferred_session_platform: z.string().max(100).optional(),
      topic: z.string().max(100).optional(),
      organization: z.string().max(150).optional(),
      role: z.string().max(150).optional(),
      country: z.string().max(100).optional(),
      phone: z.string().max(50).optional(),
    })
    .strict()
    .optional()
    .default({}),
}).strict()

export type ContactSubmissionInput = z.infer<typeof ContactSubmissionSchema>

/**
 * Strict schema for quick membership interest submissions (/api/join)
 */
export const QuickJoinSchema = z.object({
  fullName: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z.string()
        .min(2, { message: 'Full name must be at least 2 characters.' })
        .max(150, { message: 'Full name must be 150 characters or fewer.' })
    ),
  email: z
    .string()
    .transform(normalizeEmail)
    .pipe(
      z.string()
        .min(3, { message: 'Email address is required.' })
        .max(254, { message: 'Email must be 254 characters or fewer.' })
        .regex(EMAIL_REGEX, { message: 'Please enter a valid email address.' })
    ),
  motivation: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z.string()
        .min(20, { message: 'Motivation must be between 20 and 5000 characters.' })
        .max(5000, { message: 'Motivation must be between 20 and 5000 characters.' })
    ),
  age: z
    .string()
    .max(16, { message: 'Age identifier is too long.' })
    .transform(sanitizeText)
    .optional()
    .nullable(),
  background: z
    .string()
    .max(5000, { message: 'Background must be 5000 characters or fewer.' })
    .transform(sanitizeText)
    .optional()
    .nullable(),
}).strict()

export type QuickJoinInput = z.infer<typeof QuickJoinSchema>

/**
 * Strict schema for newsletter subscriptions (/api/newsletter)
 */
export const NewsletterSchema = z
  .object({
    email: z
      .string()
      .transform(normalizeEmail)
      .pipe(
        z
          .string()
          .min(3, { message: 'Email address is required.' })
          .max(254, { message: 'Email must be 254 characters or fewer.' })
          .regex(EMAIL_REGEX, { message: 'Please enter a valid email address.' }),
      ),
    source: z.string().max(50).optional().default('team-page'),
  })
  .strict()

export type NewsletterInput = z.infer<typeof NewsletterSchema>

/**
 * Strict schema for full membership application (/api/join-application)
 */
export const JoinApplicationSchema = z.object({
  // 1. Personal
  fullName: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z.string()
        .min(2, { message: 'Full name is required.' })
        .max(150, { message: 'Full name must be 150 characters or fewer.' })
    ),
  preferredName: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(80, { message: 'Preferred name must be 80 characters or fewer.' }))
    .default(''),
  email: z
    .string()
    .transform(normalizeEmail)
    .pipe(
      z.string()
        .min(3, { message: 'Email address is required.' })
        .max(254, { message: 'Email must be 254 characters or fewer.' })
        .regex(EMAIL_REGEX, { message: 'Enter a valid email address.' })
    ),
  phone: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z.string()
        .min(3, { message: 'Phone or WhatsApp number is required.' })
        .max(50, { message: 'Phone number must be 50 characters or fewer.' })
        .regex(PHONE_REGEX, { message: 'Enter a valid phone or WhatsApp number.' })
    ),
  country: z
    .string()
    .transform(sanitizeText)
    .refine((code) => VALID_COUNTRY_CODES.has(code), {
      message: 'Select a valid country from the list.',
    }),
  city: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z.string()
        .min(1, { message: 'City is required.' })
        .max(100, { message: 'City must be 100 characters or fewer.' })
    ),

  // 2. Academic / Professional
  currentStatus: z
    .string()
    .transform(sanitizeText)
    .refine((val) => VALID_STATUS_OPTIONS.has(val), {
      message: 'Select a valid status option.',
    }),
  institution: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z.string()
        .min(2, { message: 'Institution or organization is required.' })
        .max(180, { message: 'Institution must be 180 characters or fewer.' })
    ),
  degree: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(120, { message: 'Degree must be 120 characters or fewer.' }))
    .default(''),
  currentYear: z
    .string()
    .transform(sanitizeText)
    .refine((val) => val === '' || VALID_YEAR_OPTIONS.has(val), {
      message: 'Select a valid year or semester option.',
    })
    .default(''),
  linkedin: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(2048))
    .refine((val) => val === '' || isSafeWebUrl(val), {
      message: 'Enter a full URL starting with http:// or https://',
    })
    .default(''),
  github: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(2048))
    .refine((val) => val === '' || isSafeWebUrl(val), {
      message: 'Enter a full URL starting with http:// or https://',
    })
    .default(''),
  portfolio: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(2048))
    .refine((val) => val === '' || isSafeWebUrl(val), {
      message: 'Enter a full URL starting with http:// or https://',
    })
    .default(''),

  // 3. Divisions
  divisions: z
    .array(z.string().transform(sanitizeText))
    .min(1, { message: 'Select at least one division.' })
    .max(20, { message: 'Too many division selections.' })
    .refine((items) => items.every((item) => VALID_DIVISION_IDS.has(item)), {
      message: 'One or more selected divisions are invalid.',
    }),
  primaryDivision: z
    .string()
    .transform(sanitizeText)
    .refine((item) => VALID_DIVISION_IDS.has(item), {
      message: 'Select a valid primary division.',
    }),
  otherDivision: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(120, { message: 'Other division must be 120 characters or fewer.' }))
    .default(''),

  // 4. Skills & Experience
  skills: z
    .array(z.string().transform(sanitizeText))
    .max(40, { message: 'Too many skill selections.' })
    .default([]),
  otherSkill: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(120, { message: 'Other skill must be 120 characters or fewer.' }))
    .default(''),
  skillLevel: z
    .string()
    .transform(sanitizeText)
    .refine((val) => VALID_SKILL_LEVELS.has(val), {
      message: 'Select a valid skill level.',
    }),
  yearsExperience: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(50))
    .default(''),
  previousExperience: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(3000, { message: 'Previous experience must be 3000 characters or fewer.' }))
    .default(''),
  projects: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(3000, { message: 'Projects description must be 3000 characters or fewer.' }))
    .default(''),
  certifications: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(2000, { message: 'Certifications must be 2000 characters or fewer.' }))
    .default(''),
  cyberAreas: z
    .array(z.string().transform(sanitizeText))
    .max(40, { message: 'Too many cyber area selections.' })
    .default([]),
  otherCyberArea: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(120, { message: 'Other cyber area must be 120 characters or fewer.' }))
    .default(''),

  // 5. Declarations
  declarations: z
    .array(z.string().transform(sanitizeText))
    .refine(
      (items) => REQUIRED_DECLARATION_IDS.every((id) => items.includes(id)),
      { message: 'Please accept every declaration to submit.' }
    ),
})
  .strict()
  .refine(
    (data) => data.divisions.includes(data.primaryDivision),
    {
      message: 'Your primary division must also be in your division list.',
      path: ['primaryDivision'],
    }
  )
  .refine(
    (data) => data.skills.length > 0 || Boolean(data.otherSkill.trim()),
    {
      message: 'Select at least one skill or describe one in Other.',
      path: ['skills'],
    }
  )

export type JoinApplicationInput = z.infer<typeof JoinApplicationSchema>
