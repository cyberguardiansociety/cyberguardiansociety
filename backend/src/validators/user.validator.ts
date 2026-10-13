import { z } from 'zod'

// Simplified RFC 5322 regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
const PHONE_REGEX = /^[+]?[\d\s().-]{3,50}$/

function sanitizeString(str: unknown): string {
  if (typeof str !== 'string') return ''
  return str
    .replace(/\0/g, '')
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

function normalizeEmailStr(email: unknown): string {
  if (typeof email !== 'string') return ''
  return sanitizeString(email).toLowerCase()
}

/**
 * Validation schema for Contact & Speaker submissions
 */
export const contactValidator = z.object({
  name: z
    .string()
    .transform(sanitizeString)
    .pipe(
      z.string()
        .min(2, { message: 'Name must be at least 2 characters.' })
        .max(120, { message: 'Name must be 120 characters or fewer.' })
    ),
  email: z
    .string()
    .transform(normalizeEmailStr)
    .pipe(
      z.string()
        .min(3, { message: 'Email address is required.' })
        .max(254, { message: 'Email must be 254 characters or fewer.' })
        .regex(EMAIL_REGEX, { message: 'Please enter a valid email address.' })
    ),
  message: z
    .string()
    .transform(sanitizeString)
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

export type ContactInput = z.infer<typeof contactValidator>

/**
 * Validation schema for Quick Join submissions
 */
export const quickJoinValidator = z.object({
  fullName: z
    .string()
    .transform(sanitizeString)
    .pipe(
      z.string()
        .min(2, { message: 'Full name must be at least 2 characters.' })
        .max(150, { message: 'Full name must be 150 characters or fewer.' })
    ),
  email: z
    .string()
    .transform(normalizeEmailStr)
    .pipe(
      z.string()
        .min(3, { message: 'Email address is required.' })
        .max(254, { message: 'Email must be 254 characters or fewer.' })
        .regex(EMAIL_REGEX, { message: 'Please enter a valid email address.' })
    ),
  motivation: z
    .string()
    .transform(sanitizeString)
    .pipe(
      z.string()
        .min(20, { message: 'Motivation must be between 20 and 5000 characters.' })
        .max(5000, { message: 'Motivation must be between 20 and 5000 characters.' })
    ),
  age: z
    .string()
    .max(16, { message: 'Age identifier is too long.' })
    .transform(sanitizeString)
    .optional()
    .nullable(),
  background: z
    .string()
    .max(5000, { message: 'Background must be 5000 characters or fewer.' })
    .transform(sanitizeString)
    .optional()
    .nullable(),
}).strict()

export type QuickJoinInput = z.infer<typeof quickJoinValidator>
