import { NextResponse } from 'next/server'
import { hasSameOrigin, readMultipartBody } from '@/lib/api-security'
import { JoinApplicationSchema } from '@/lib/schemas/public-forms'
import {
  checkDuplicateSubmission,
  checkRateLimit,
  RATE_LIMIT_POLICIES,
  recordSubmission,
} from '@/lib/security/public-rate-limiter'
import { logPublicFormEvent } from '@/lib/security/public-form-audit'
import { getPortalSettings } from '@/lib/portal-settings'
import {
  deletePrivateObject,
  isStorageConfigured,
  uploadPrivateObject,
} from '@/lib/supabase-storage'

export const runtime = 'nodejs'

/** Hard payload limits — 5 MB max for CV + 256 KB for JSON metadata */
const CV_MAX_BYTES = 5 * 1024 * 1024
const MAX_REQUEST_BYTES = CV_MAX_BYTES + 256 * 1024

type FieldErrors = Record<string, string>

function fail(
  message: string,
  status = 400,
  code = 'INVALID_APPLICATION',
  errors?: FieldErrors,
  headers?: Record<string, string>,
) {
  return NextResponse.json({ error: message, code, errors }, { status, headers })
}

/**
 * Validates that a file is a genuine PDF file:
 * 1. MIME type must be application/pdf
 * 2. Filename must end with .pdf
 * 3. File magic bytes (signature) must begin with %PDF-
 */
async function isRealPdf(file: File): Promise<boolean> {
  if (file.type !== 'application/pdf') return false
  if (!file.name.toLowerCase().endsWith('.pdf')) return false
  try {
    const head = new Uint8Array(await file.slice(0, 5).arrayBuffer())
    const signature = String.fromCharCode(...head)
    return signature.startsWith('%PDF-')
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  // 1. Origin verification
  if (!hasSameOrigin(request)) {
    return fail('Request origin is not allowed.', 403, 'ORIGIN_NOT_ALLOWED')
  }

  try {
    if ((await getPortalSettings()).join_cgs_coming_soon) {
      await logPublicFormEvent({ action: 'join_application_closed', request })
      return fail('The CGS application form is temporarily closed.', 503, 'FORM_COMING_SOON')
    }
  } catch {
    return fail('The application service is temporarily unavailable.', 503, 'SETTINGS_UNAVAILABLE')
  }

  // 2. Sliding-window rate limit (3 requests per 1 hour per IP)
  const rateLimit = await checkRateLimit(request, RATE_LIMIT_POLICIES.JOIN_APPLICATION)
  if (!rateLimit.allowed) {
    await logPublicFormEvent({
      action: 'join_rate_limited',
      request,
      details: {
        retryAfter: rateLimit.retryAfterSeconds,
        limit: rateLimit.totalLimit,
      },
    })

    return fail(
      'Too many applications. Please try again later.',
      429,
      'RATE_LIMITED',
      undefined,
      {
        'Retry-After': String(rateLimit.retryAfterSeconds),
        'X-RateLimit-Limit': String(rateLimit.totalLimit),
        'X-RateLimit-Remaining': '0',
      },
    )
  }

  // 3. Bounded multipart payload reading
  const parsedForm = await readMultipartBody(request, MAX_REQUEST_BYTES)
  if (!parsedForm.ok) {
    return fail(
      parsedForm.error,
      parsedForm.status,
      parsedForm.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_APPLICATION',
    )
  }

  const form = parsedForm.data

  const getFormString = (key: string): string => {
    const val = form.get(key)
    return typeof val === 'string' ? val : ''
  }

  const getFormList = (key: string): string[] => {
    const val = form.get(key)
    if (typeof val !== 'string' || !val.trim()) return []
    return val
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  // 4. Assemble structured object for Zod validation
  const rawData = {
    fullName: getFormString('fullName'),
    preferredName: getFormString('preferredName'),
    email: getFormString('email'),
    phone: getFormString('phone'),
    country: getFormString('country'),
    city: getFormString('city'),
    currentStatus: getFormString('currentStatus'),
    institution: getFormString('institution'),
    degree: getFormString('degree'),
    currentYear: getFormString('currentYear'),
    linkedin: getFormString('linkedin'),
    github: getFormString('github'),
    portfolio: getFormString('portfolio'),
    divisions: getFormList('divisions'),
    primaryDivision: getFormString('primaryDivision'),
    otherDivision: getFormString('otherDivision'),
    skills: getFormList('skills'),
    otherSkill: getFormString('otherSkill'),
    skillLevel: getFormString('skillLevel'),
    yearsExperience: getFormString('yearsExperience'),
    previousExperience: getFormString('previousExperience'),
    projects: getFormString('projects'),
    certifications: getFormString('certifications'),
    cyberAreas: getFormList('cyberAreas'),
    otherCyberArea: getFormString('otherCyberArea'),
    declarations: getFormList('declarations'),
  }

  // 5. Strict Zod Schema Validation
  const parseResult = JoinApplicationSchema.safeParse(rawData)
  if (!parseResult.success) {
    const fieldErrors: FieldErrors = {}
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] ? String(issue.path[0]) : 'form'
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message
      }
    }

    await logPublicFormEvent({
      action: 'join_application_rejected',
      request,
      details: { errors: fieldErrors },
    })

    return fail('Please correct the highlighted fields.', 400, 'VALIDATION', fieldErrors)
  }

  const validated = parseResult.data

  // 6. File Attachment Verification (CV)
  const cv = form.get('cv')
  const cvFile = cv instanceof File && cv.size > 0 ? cv : null

  if (cvFile) {
    if (cvFile.size > CV_MAX_BYTES) {
      return fail(
        'Your CV must be 5 MB or smaller. Please compress it or email it to us instead.',
        400,
        'CV_TOO_LARGE',
      )
    }
    if (!(await isRealPdf(cvFile))) {
      return fail(
        'Only PDF files are accepted for the CV.',
        400,
        'CV_NOT_PDF',
      )
    }
  }

  // 7. Duplicate Submission / Idempotency Check (120 seconds window)
  const payloadDigest = `${validated.email}:${validated.fullName}:${validated.primaryDivision}`
  const duplicateCheck = checkDuplicateSubmission('join-application', validated.email, payloadDigest, 120)
  if (duplicateCheck.isDuplicate && duplicateCheck.reference) {
    await logPublicFormEvent({
      action: 'join_duplicate_blocked',
      request,
      email: validated.email,
      entityId: duplicateCheck.reference,
      details: { ageSeconds: duplicateCheck.ageSeconds },
    })

    return NextResponse.json({
      success: true,
      reference: duplicateCheck.reference,
      message: 'Application received successfully.',
      storedAttachmentCount: cvFile ? 1 : 0,
    })
  }

  // 8. Storage Availability Check
  if (!isStorageConfigured()) {
    await logPublicFormEvent({
      action: 'join_storage_failure',
      request,
      email: validated.email,
      error: 'Supabase storage is not configured',
    })
    return fail(
      'Secure application storage is temporarily unavailable. Please try again later.',
      503,
      'STORAGE_UNAVAILABLE',
    )
  }

  // 9. Generate Reference & Storage Folder
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  const nonce = crypto.randomUUID().replaceAll('-', '')
  const reference = `CGS-${stamp.replace(/-/g, '').slice(0, 8)}-${nonce.toUpperCase()}`
  const folder = `applications/${stamp}_${nonce}`

  const applicationRecord = {
    reference,
    submittedAt: new Date().toISOString(),
    personal: {
      fullName: validated.fullName,
      preferredName: validated.preferredName,
      email: validated.email,
      phone: validated.phone,
      country: validated.country,
      city: validated.city,
    },
    academic: {
      currentStatus: validated.currentStatus,
      institution: validated.institution,
      degree: validated.degree,
      currentYear: validated.currentYear,
      linkedin: validated.linkedin,
      github: validated.github,
      portfolio: validated.portfolio,
    },
    divisions: {
      selected: validated.divisions,
      primary: validated.primaryDivision,
      other: validated.otherDivision,
    },
    skills: {
      selected: validated.skills,
      other: validated.otherSkill,
      level: validated.skillLevel,
      yearsExperience: validated.yearsExperience,
      previousExperience: validated.previousExperience,
      projects: validated.projects,
      certifications: validated.certifications,
    },
    cybersecurity: {
      areas: validated.cyberAreas,
      other: validated.otherCyberArea,
    },
    declarations: validated.declarations,
    attachments: {
      cv: cvFile ? { name: 'cv.pdf', size: cvFile.size } : null,
    },
  }

  const uploads: string[] = []
  let uploadedCvPath: string | null = null

  // 10. Upload CV securely to private bucket
  if (cvFile) {
    const buffer = new Uint8Array(await cvFile.arrayBuffer())
    const cvUploadResult = await uploadPrivateObject({
      path: `${folder}/cv.pdf`,
      body: buffer,
      contentType: 'application/pdf',
    })

    if (!cvUploadResult.ok) {
      await logPublicFormEvent({
        action: 'join_storage_failure',
        request,
        email: validated.email,
        error: cvUploadResult.error,
      })
      return fail(
        'Secure application storage is temporarily unavailable. Please try again later.',
        503,
        'STORAGE_UNAVAILABLE',
      )
    }

    uploads.push(cvUploadResult.path)
    uploadedCvPath = `${folder}/cv.pdf`
  }

  // 11. Upload sanitized application JSON
  const jsonUploadResult = await uploadPrivateObject({
    path: `${folder}/application.json`,
    body: JSON.stringify(applicationRecord, null, 2),
    contentType: 'application/json',
  })

  if (!jsonUploadResult.ok) {
    // Rollback uploaded CV if JSON storage failed
    if (uploadedCvPath) {
      await deletePrivateObject(uploadedCvPath)
    }

    await logPublicFormEvent({
      action: 'join_storage_failure',
      request,
      email: validated.email,
      error: jsonUploadResult.error,
    })

    return fail(
      'Secure application storage is temporarily unavailable. Please try again later.',
      503,
      'STORAGE_UNAVAILABLE',
    )
  }

  uploads.push(jsonUploadResult.path)

  // Record in duplicate cache
  recordSubmission('join-application', validated.email, payloadDigest, reference)

  // 12. Privacy-safe audit log
  await logPublicFormEvent({
    action: 'join_application_success',
    request,
    email: validated.email,
    entityId: reference,
    details: {
      primary_division: validated.primaryDivision,
      divisions: validated.divisions,
      country: validated.country,
      city: validated.city,
      has_cv: Boolean(cvFile),
      stored_objects_count: uploads.length,
    },
  })

  return NextResponse.json({
    success: true,
    reference,
    message: 'Application received successfully.',
    storedAttachmentCount: cvFile ? 1 : 0,
  })
}
