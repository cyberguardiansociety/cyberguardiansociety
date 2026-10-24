import {
  isHighAccuracyValidVerification,
  logVerificationAttempt,
  getCertificateLogs,
  purgeInvalidCertificateLogs,
} from '../lib/certificate-logs-store'
import { lookupCertificate } from '../lib/certificates-store'
import { createSupabaseServiceClient } from '../lib/supabase/service'

async function runTests() {
  console.log('--- Running Certificate High-Accuracy Filter Tests ---')
  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✔ ${testName}`)
      passed++
    } else {
      console.error(`  ✖ FAIL: ${testName}`)
      failed++
    }
  }

  // 1. Validator Tests
  assert(
    isHighAccuracyValidVerification({
      status: 'failed',
      reference_id: 'CGS-Y14QTT3A',
      participant_name: 'Reyan wahid',
      message: 'Failed lookup',
    }) === false,
    'Rejects entry with status !== "success"'
  )

  assert(
    isHighAccuracyValidVerification({
      status: 'success',
      reference_id: 'EMPTY',
      participant_name: 'Reyan wahid',
      message: 'Verified',
    }) === false,
    'Rejects entry with reference_id "EMPTY"'
  )

  assert(
    isHighAccuracyValidVerification({
      status: 'success',
      reference_id: 'UNKNOWN',
      participant_name: 'Reyan wahid',
      message: 'Verified',
    }) === false,
    'Rejects entry with reference_id "UNKNOWN"'
  )

  assert(
    isHighAccuracyValidVerification({
      status: 'success',
      reference_id: 'CGS-Y14QTT3A',
      participant_name: '',
      message: 'Verified',
    }) === false,
    'Rejects entry with empty participant_name'
  )

  assert(
    isHighAccuracyValidVerification({
      status: 'success',
      reference_id: 'CGS-Y14QTT3A',
      participant_name: 'Unrecognized',
      message: 'Verified',
    }) === false,
    'Rejects entry with placeholder participant_name "Unrecognized"'
  )

  assert(
    isHighAccuracyValidVerification({
      status: 'success',
      reference_id: 'CGS-Y14QTT3A',
      participant_name: 'Reyan wahid',
      message: 'Certificate verified from CGS for Reyan wahid',
    }) === true,
    'Accepts valid, authentic certificate entry with high accuracy'
  )

  // 2. Storage Rejection Test: Invalid entries must NOT be recorded to database
  const supabase = createSupabaseServiceClient()

  // Get current DB count of certificate verification audit logs
  const { data: beforeAudit } = await supabase
    .from('admin_audit_log')
    .select('id')
    .eq('entity', 'certificate_verification')
  const countBefore = beforeAudit?.length || 0

  // Attempt to log an invalid / failed query
  const invalidResult = await logVerificationAttempt({
    reference_id: 'CGS-NONEXISTENT',
    participant_name: null,
    status: 'failed',
    message: 'No certificate found matching Reference ID "CGS-NONEXISTENT"',
    ip_address: '127.0.0.1',
    user_agent: 'TestAgent',
  })

  assert(invalidResult === null, 'logVerificationAttempt returns null for invalid query')

  // Verify database count did NOT increase
  const { data: afterAudit } = await supabase
    .from('admin_audit_log')
    .select('id')
    .eq('entity', 'certificate_verification')
  const countAfter = afterAudit?.length || 0

  assert(
    countAfter === countBefore,
    `Database audit log was NOT modified by invalid attempt (count before: ${countBefore}, after: ${countAfter})`
  )

  // 3. Lookup & Valid Storage Test
  const cert = await lookupCertificate('CGS-Y14QTT3A')
  assert(cert !== null && cert.ref_id === 'CGS-Y14QTT3A', 'Authoritative lookup finds valid certificate')

  if (cert) {
    const validLog = await logVerificationAttempt({
      reference_id: cert.ref_id,
      participant_name: cert.name,
      participant_email: cert.email,
      status: 'success',
      message: `Certificate verified from CGS for ${cert.name}`,
      ip_address: '127.0.0.1',
      user_agent: 'TestBrowser',
    })

    assert(validLog !== null && validLog.status === 'success', 'logVerificationAttempt records valid verification')

    // Confirm that it was inserted into database
    const { data: recordedRows } = await supabase
      .from('admin_audit_log')
      .select('id, action, details')
      .eq('id', validLog!.id)
      .maybeSingle()

    assert(
      recordedRows !== null && recordedRows.action === 'certificate_verify_success',
      'Valid verification was recorded to Supabase admin_audit_log table'
    )

    // Clean up the test row
    await supabase.from('admin_audit_log').delete().eq('id', validLog!.id)
  }

  // 4. Test purge function
  const purged = await purgeInvalidCertificateLogs()
  assert(typeof purged === 'number', 'purgeInvalidCertificateLogs returns numeric count of purged records')

  console.log(`\nResults: ${passed} passed, ${failed} failed.`)
  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err)
  process.exit(1)
})
