import { validatePasswordPolicy } from '../lib/security/password'
import {
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  confirmEnrollment,
  verify2FA,
  reset2FA,
  is2FAEnrolled,
} from '../lib/security/totp'
import {
  isAccountLocked,
  recordFailedLogin,
  recordSuccessfulLogin,
  unlockAccount,
} from '../lib/security/lockout'
import { checkRateLimit } from '../lib/security/rate-limiter'
import { adminUrl, ADMIN_BASE_PATH } from '../lib/admin-config'
import { generateSecret, generateSync } from 'otplib'

let passed = 0
let failed = 0

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${testName}`)
    failed++
  }
}

async function runTests() {
  console.log('\n========================================')
  console.log('CGS ADMIN SECURITY SUITE TESTS')
  console.log('========================================\n')

  // ── 1. Admin URL & Secret Path Tests ──
  console.log('1. Admin Path & URL Generation:')
  assert(ADMIN_BASE_PATH.startsWith('/'), 'ADMIN_BASE_PATH starts with /')
  assert(ADMIN_BASE_PATH.length >= 20, 'ADMIN_BASE_PATH meets minimum 20-character entropy requirement')
  assert(!['/admin', '/login', '/wp-admin'].includes(ADMIN_BASE_PATH), 'ADMIN_BASE_PATH is not a well-known path')

  const urlOverview = adminUrl()
  assert(urlOverview === ADMIN_BASE_PATH, 'adminUrl() returns base secret path')

  const urlInbox = adminUrl('', { view: 'inbox' })
  assert(urlInbox === `${ADMIN_BASE_PATH}?view=inbox`, 'adminUrl with view query generates correct secret URL')

  const urlLogin = adminUrl('/login')
  assert(urlLogin === `${ADMIN_BASE_PATH}/login`, 'adminUrl returns the password-only login route')

  // ── 2. Password Policy Tests ──
  console.log('\n2. Password Policy & Complexity:')
  assert(!validatePasswordPolicy('short').valid, 'Rejects password shorter than 12 characters')
  assert(!validatePasswordPolicy('password1234').valid, 'Rejects common dictionary password')
  assert(!validatePasswordPolicy('cyberguardiansociety').valid, 'Rejects simple lowercase dictionary passphrase')
  assert(validatePasswordPolicy('CgsDefenders!2026SecurePass#').valid, 'Accepts strong complex password')

  // ── 3. AES-256-GCM TOTP Encryption Tests ──
  console.log('\n3. AES-256-GCM Cryptographic Secrets At Rest:')
  const plainSecret = generateSecret()
  const encrypted = encryptSecret(plainSecret)
  assert(encrypted.includes(':'), 'Encrypted payload contains IV:TAG:Ciphertext structure')
  assert(encrypted !== plainSecret, 'Encrypted payload is ciphertext, not plaintext')
  const decrypted = decryptSecret(encrypted)
  assert(decrypted === plainSecret, 'AES-256-GCM successfully decrypts back to original secret')

  // ── 4. TOTP 2FA Verification & Anti-Replay ──
  console.log('\n4. Multi-Factor Authentication & Single-Use Recovery Keys:')
  const testUserId = 'test-admin-uuid-12345'
  const testEmail = 'security-test@example.invalid'

  reset2FA(testUserId)
  assert(!is2FAEnrolled(testUserId), 'User is initially not enrolled in 2FA')

  const { codes, hashes } = generateRecoveryCodes(10)
  assert(codes.length === 10, 'Generates 10 single-use recovery codes')
  assert(hashes.length === 10, 'Generates 10 corresponding SHA-256 hashes')

  const currentOtp = generateSync({ secret: plainSecret })
  const enrolled = confirmEnrollment(testUserId, testEmail, plainSecret, currentOtp, hashes)
  assert(enrolled, 'Enrolls 2FA successfully with valid confirmation code')
  assert(is2FAEnrolled(testUserId), 'User is now marked as 2FA enrolled')

  // Verify valid TOTP
  const verifyValid = verify2FA(testUserId, testEmail, currentOtp)
  assert(verifyValid.valid === true, 'Valid TOTP code succeeds')

  // Anti-replay test
  const verifyReplayed = verify2FA(testUserId, testEmail, currentOtp)
  assert(verifyReplayed.valid === false, 'Replayed TOTP code within same window is rejected')

  // Recovery code test
  const firstRecoveryCode = codes[0]
  const verifyRecovery1 = verify2FA(testUserId, testEmail, firstRecoveryCode)
  assert(verifyRecovery1.valid === true && verifyRecovery1.usedRecoveryCode === true, 'Recovery code successfully authenticates')

  // Second use of the same recovery code must fail
  const verifyRecoveryReuse = verify2FA(testUserId, testEmail, firstRecoveryCode)
  assert(verifyRecoveryReuse.valid === false, 'Used recovery code is immediately invalidated (single-use)')
  reset2FA(testUserId)

  // ── 5. Rate Limiting Tests ──
  console.log('\n5. Sliding Window IP Rate Limiting:')
  const testIp = '198.51.100.99'
  const limitPrefix = `test-limit-${Date.now()}`

  for (let i = 1; i <= 5; i++) {
    const res = await checkRateLimit(testIp, limitPrefix, 5, 10000)
    assert(res.allowed === true, `Attempt ${i}/5 is allowed`)
  }

  const blockedRes = await checkRateLimit(testIp, limitPrefix, 5, 10000)
  assert(blockedRes.allowed === false, 'Attempt 6/5 is blocked with 429 rate limit')
  assert(blockedRes.remaining === 0, 'Remaining attempts is 0')

  // ── 6. Account Lockout & Progressive Escalation ──
  console.log('\n6. Account Lockout & CLI Recovery:')
  const lockUser = 'lock-target@example.invalid'
  await unlockAccount(lockUser)

  assert(!(await isAccountLocked(lockUser)).locked, 'User starts in unlocked state')

  for (let i = 1; i <= 4; i++) {
    const fail = await recordFailedLogin(lockUser)
    assert(!fail.isNowLocked, `Failed login ${i}/5 does not lock account yet`)
  }

  const lockTrigger = await recordFailedLogin(lockUser)
  assert(lockTrigger.isNowLocked === true, 'Failed login 5/5 triggers account lockout')
  assert((await isAccountLocked(lockUser)).locked === true, 'Account is verified locked')

  const unlocked = await unlockAccount(lockUser)
  assert(unlocked === true, 'CLI unlockAccount clears lockout')
  assert(!(await isAccountLocked(lockUser)).locked, 'Account is now active and unlocked')

  await recordSuccessfulLogin(lockUser)

  console.log('\n========================================')
  console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
