// Mock server-only before importing any modules
import Module from 'module'
try {
  const serverOnlyPath = require.resolve('server-only')
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any
} catch {}

// @ts-ignore
const origRequire = (Module as any).prototype.require
// @ts-ignore
;(Module as any).prototype.require = function (this: any, id: string, ...args: any[]) {
  if (id === 'server-only') return {}
  return origRequire.apply(this, [id, ...args])
}

let passed = 0
let failed = 0

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${testName}`)
    passed++
  } else {
    console.error(`  \x1b[31m✖\x1b[0m ${testName}${errorDetail ? ` -> ${errorDetail}` : ''}`)
    failed++
  }
}

async function runTests() {
  const {
    ContactSubmissionSchema,
    JoinApplicationSchema,
    QuickJoinSchema,
    REQUIRED_DECLARATION_IDS,
  } = await import('../lib/schemas/public-forms')
  const {
    isSafeWebUrl,
    maskEmail,
    maskIp,
    sanitizeForCsv,
    sanitizeText,
  } = await import('../lib/security/input-sanitizer')
  const {
    checkDuplicateSubmission,
    checkRateLimit,
    getClientIp,
    RATE_LIMIT_POLICIES,
    recordSubmission,
  } = await import('../lib/security/public-rate-limiter')
  console.log('\n======================================================')
  console.log('🔒 CGS PUBLIC FORMS PRODUCTION SECURITY TEST SUITE')
  console.log('======================================================\n')

  // ─── 1. Sanitization & Output Security ──────────────────────────
  console.log('--- 1. Sanitization & Injection Neutralization Tests ---')

  const nullByteInput = 'Cyber\0Guardian\0Society'
  assert(sanitizeText(nullByteInput) === 'CyberGuardianSociety', 'Strips null bytes from text input')

  const bidiInput = 'Test\u202Ereversed\u202Dtext'
  assert(sanitizeText(bidiInput) === 'Testreversedtext', 'Strips Unicode bidirectional override characters')

  const controlChars = 'Valid\x01\x02\x07Text\x1F'
  assert(sanitizeText(controlChars) === 'ValidText', 'Strips unprintable ASCII control characters')

  const normalMultiLine = 'Line 1\nLine 2\r\nLine 3\tTabbed'
  assert(sanitizeText(normalMultiLine) === normalMultiLine, 'Preserves legitimate multi-line formatting & tabs')

  const csvFormula1 = '=cmd|"/c calc"!A1'
  assert(sanitizeForCsv(csvFormula1) === "'=cmd|\"/c calc\"!A1", 'Neutralizes CSV Formula Injection (= prefix)')

  const csvFormula2 = '+123456789'
  assert(sanitizeForCsv(csvFormula2) === "'+123456789", 'Neutralizes CSV Formula Injection (+ prefix)')

  const csvFormula3 = '@SUM(1+1)'
  assert(sanitizeForCsv(csvFormula3) === "'@SUM(1+1)", 'Neutralizes CSV Formula Injection (@ prefix)')

  const csvSafe = 'Ordinary security researcher name'
  assert(sanitizeForCsv(csvSafe) === 'Ordinary security researcher name', 'Leaves safe CSV text unaltered')

  assert(isSafeWebUrl('https://linkedin.com/in/cyberdefender'), 'Accepts valid HTTPS URL')
  assert(isSafeWebUrl('http://github.com/cgs'), 'Accepts valid HTTP URL')
  assert(!isSafeWebUrl('javascript:alert(1)'), 'Rejects javascript: pseudo-protocol URL')
  assert(!isSafeWebUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), 'Rejects data: URI')
  assert(!isSafeWebUrl('https://user:password@malicious.com'), 'Rejects URL with embedded credentials')
  assert(!isSafeWebUrl('not-a-url'), 'Rejects malformed URL strings')

  // ─── 2. Privacy Masking Tests ───────────────────────────────────
  console.log('\n--- 2. Privacy Masking Tests ---')
  assert(maskEmail('shanyan.ahmed@example.com') === 's***d@example.com', 'Masks standard email address for audit logs')
  assert(maskEmail('ab@test.org') === 'a*@test.org', 'Masks short email address properly')
  assert(maskIp('192.168.1.105') === '192.168.***.***', 'Masks IPv4 address for privacy compliance')
  assert(maskIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334') === '2001:0db8:****', 'Masks IPv6 address for privacy compliance')

  // ─── 3. Contact Us Schema Validation Tests ──────────────────────
  console.log('\n--- 3. Contact Us Schema Validation Tests ---')

  const validContact = {
    name: 'Sarah Connor',
    email: 'sarah.connor@resistance.org',
    message: 'We are organizing an incident response workshop and would like CGS mentors to speak.',
    source: 'contact-form',
  }
  const contactResult = ContactSubmissionSchema.safeParse(validContact)
  assert(contactResult.success, 'Valid Contact Us submission passes validation')

  // Missing name
  const missingName = { ...validContact, name: '' }
  assert(!ContactSubmissionSchema.safeParse(missingName).success, 'Rejects contact submission with empty name')

  // Malformed email
  const badEmail = { ...validContact, email: 'not-an-email' }
  assert(!ContactSubmissionSchema.safeParse(badEmail).success, 'Rejects contact submission with invalid email')

  // Message too short (< 20 chars)
  const shortMessage = { ...validContact, message: 'Too short' }
  assert(!ContactSubmissionSchema.safeParse(shortMessage).success, 'Rejects contact submission with message < 20 characters')

  // Message too long (> 1200 chars)
  const longMessage = { ...validContact, message: 'a'.repeat(1201) }
  assert(!ContactSubmissionSchema.safeParse(longMessage).success, 'Rejects contact submission with message > 1200 characters')

  // Privilege injection attempt (.strict() rejects unexpected properties)
  const privilegedContact = { ...validContact, role: 'super_admin', is_admin: true, status: 'approved' }
  assert(!ContactSubmissionSchema.safeParse(privilegedContact).success, 'Rejects contact submission with injected privilege fields')

  // Speaker application source & metadata
  const validSpeaker = {
    name: 'Dr. John Doe',
    email: 'jdoe@cyberlab.edu',
    message: 'Topic: Join as a speaker\nExpertise: Threat Hunting\nProposed session: Hunting Advanced Threats in Memory\n\nPractical live workshop.',
    source: 'speaker-application',
    metadata: {
      source: 'speaker-application',
      expertise: 'Threat Hunting',
      session_title: 'Hunting Advanced Threats in Memory',
      preferred_session_platform: 'Zoom',
    },
  }
  assert(ContactSubmissionSchema.safeParse(validSpeaker).success, 'Accepts valid speaker proposal via contact schema')

  // ─── 4. Quick Join Schema Validation Tests ──────────────────────
  console.log('\n--- 4. Quick Join Schema Validation Tests ---')

  const validQuickJoin = {
    fullName: 'Alex Vance',
    email: 'alex@blackmesa.org',
    motivation: 'I want to help defend academic infrastructure from ransomware campaigns and share research.',
    age: '24',
    background: 'Computer Science graduate with 2 years of SOC experience.',
  }
  assert(QuickJoinSchema.safeParse(validQuickJoin).success, 'Valid Quick Join submission passes validation')

  const invalidQuickJoin = { ...validQuickJoin, motivation: 'Too short' }
  assert(!QuickJoinSchema.safeParse(invalidQuickJoin).success, 'Rejects Quick Join submission with short motivation')

  // ─── 5. Join Application Schema Validation Tests ────────────────
  console.log('\n--- 5. Full Join Application Schema Validation Tests ---')

  const validApplication = {
    fullName: 'David Lightman',
    preferredName: 'Dave',
    email: 'dave@wopr.mil',
    phone: '+1 555 019 2834',
    country: 'US',
    city: 'Seattle',
    currentStatus: 'University Student',
    institution: 'University of Washington',
    degree: 'B.S. Cybersecurity',
    currentYear: '3rd year',
    linkedin: 'https://linkedin.com/in/davelightman',
    github: 'https://github.com/davelightman',
    portfolio: 'https://davelightman.dev',
    divisions: ['cybersecurity', 'events'],
    primaryDivision: 'cybersecurity',
    otherDivision: '',
    skills: ['Network security', 'Web security', 'Reverse engineering'],
    otherSkill: '',
    skillLevel: 'Intermediate',
    yearsExperience: '3',
    previousExperience: 'Built CTF challenges and led university security club.',
    projects: 'Open-source memory forensics tool.',
    certifications: 'CompTIA Security+, CEH',
    cyberAreas: ['Network Security', 'Penetration Testing'],
    otherCyberArea: '',
    declarations: [...REQUIRED_DECLARATION_IDS],
  }

  const appResult = JoinApplicationSchema.safeParse(validApplication)
  assert(appResult.success, 'Valid full membership application passes validation')

  // Primary division not in selected divisions
  const badPrimary = { ...validApplication, primaryDivision: 'marketing' }
  assert(!JoinApplicationSchema.safeParse(badPrimary).success, 'Rejects application where primary division is not in selected divisions')

  // Invalid country code
  const badCountry = { ...validCountry(validApplication), country: 'INVALID_COUNTRY_XYZ' }
  assert(!JoinApplicationSchema.safeParse(badCountry).success, 'Rejects application with unlisted country code')

  // Missing declaration
  const missingDecl = { ...validApplication, declarations: ['accuracy', 'conduct'] }
  assert(!JoinApplicationSchema.safeParse(missingDecl).success, 'Rejects application missing mandatory declarations')

  // Malformed phone
  const badPhone = { ...validApplication, phone: 'bad-phone-letters-abc' }
  assert(!JoinApplicationSchema.safeParse(badPhone).success, 'Rejects application with invalid phone format')

  // Malformed URLs
  const badUrls = { ...validApplication, linkedin: 'javascript:evil()' }
  assert(!JoinApplicationSchema.safeParse(badUrls).success, 'Rejects application with unsafe javascript: URL')

  // ─── 6. File Upload PDF Signature & Boundary Tests ──────────────
  console.log('\n--- 6. File Upload Security Tests ---')

  const validPdfHead = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]) // '%PDF-'
  const validSignature = String.fromCharCode(...validPdfHead)
  assert(validSignature.startsWith('%PDF-'), 'Recognizes authentic %PDF- magic byte signature')

  const fakePdfHead = new Uint8Array([0x3c, 0x21, 0x44, 0x4f, 0x43]) // '<!DOC'
  const fakeSignature = String.fromCharCode(...fakePdfHead)
  assert(!fakeSignature.startsWith('%PDF-'), 'Rejects fake PDF disguised with HTML magic bytes')

  const exeHead = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03]) // 'MZ...' (PE Executable)
  const exeSignature = String.fromCharCode(...exeHead)
  assert(!exeSignature.startsWith('%PDF-'), 'Rejects executable binary disguised as PDF')

  // ─── 7. Proxy-Aware IP Extraction Tests ─────────────────────────
  console.log('\n--- 7. Proxy-Aware IP Extraction Tests ---')

  const cfReq = new Request('http://localhost/api/contact', {
    headers: { 'cf-connecting-ip': '203.0.113.195' },
  })
  assert(getClientIp(cfReq) === '203.0.113.195', 'Correctly extracts Cloudflare connecting IP')

  const proxyReq = new Request('http://localhost/api/contact', {
    headers: { 'x-forwarded-for': '198.51.100.42, 10.0.0.1, 10.0.0.2' },
  })
  assert(getClientIp(proxyReq) === '198.51.100.42', 'Correctly extracts leftmost client IP from X-Forwarded-For')

  const spoofedReq = new Request('http://localhost/api/contact', {
    headers: { 'x-forwarded-for': 'not-an-ip, 198.51.100.88' },
  })
  assert(getClientIp(spoofedReq) === '198.51.100.88', 'Ignores invalid/malformed entries in X-Forwarded-For chain')

  // ─── 8. Sliding-Window Rate Limiting Tests ───────────────────────
  console.log('\n--- 8. Rate Limiting Tests ---')

  const testIp = `192.0.2.${Math.floor(Math.random() * 200) + 10}`
  const makeReq = () =>
    new Request('http://localhost/api/contact', {
      headers: { 'x-real-ip': testIp },
    })

  // Contact policy allows 5 requests per 10 minutes
  for (let i = 1; i <= 5; i++) {
    const res = await checkRateLimit(makeReq(), RATE_LIMIT_POLICIES.CONTACT)
    assert(res.allowed, `Rate limit permits request #${i} under quota (5 max)`)
  }

  // 6th request must be rejected with 429 Retry-After indication
  const limitExceeded = await checkRateLimit(makeReq(), RATE_LIMIT_POLICIES.CONTACT)
  assert(!limitExceeded.allowed, 'Rate limit strictly blocks request #6 when quota exhausted')
  assert(limitExceeded.retryAfterSeconds > 0, 'Returns positive retryAfterSeconds when rate limited')

  // ─── 9. Duplicate / Idempotency Window Tests ─────────────────────
  console.log('\n--- 9. Duplicate Submission & Idempotency Tests ---')

  const emailKey = 'duplicate.test@cgs.org'
  const digest = 'digest_hash_12345'

  const firstCheck = checkDuplicateSubmission('contact', emailKey, digest, 60)
  assert(!firstCheck.isDuplicate, 'First submission is not treated as duplicate')

  recordSubmission('contact', emailKey, digest, 'REF-12345')

  const duplicateCheck = checkDuplicateSubmission('contact', emailKey, digest, 60)
  assert(duplicateCheck.isDuplicate, 'Rapid second submission with identical digest is blocked as duplicate')
  assert(duplicateCheck.reference === 'REF-12345', 'Preserves original submission reference on duplicate')

  const differentDigestCheck = checkDuplicateSubmission('contact', emailKey, 'different_digest_67890', 60)
  assert(!differentDigestCheck.isDuplicate, 'Different message payload from same email is not blocked as duplicate')

  // ─── Final Summary ──────────────────────────────────────────────
  console.log('\n======================================================')
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('======================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

function validCountry(obj: any) {
  return { ...obj }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err)
  process.exit(1)
})
