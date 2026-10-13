#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const targetEmail = process.argv[2]?.trim().toLowerCase()

if (!targetEmail) {
  console.error('Usage: node scripts/unlock-admin.js <admin-email>')
  process.exit(1)
}

const dataDir = path.join(process.cwd(), 'data')
const stateFile = path.join(dataDir, 'security-lockouts.json')

if (!fs.existsSync(stateFile)) {
  console.log(`No active lockout records found in ${stateFile}. The account is not locked.`)
  process.exit(0)
}

try {
  const raw = fs.readFileSync(stateFile, 'utf-8')
  const lockouts = JSON.parse(raw)

  if (!lockouts[targetEmail]) {
    console.log(`Account "${targetEmail}" has no active lockout record.`)
    process.exit(0)
  }

  const prevRecord = lockouts[targetEmail]
  delete lockouts[targetEmail]

  fs.writeFileSync(stateFile, JSON.stringify(lockouts, null, 2), 'utf-8')

  console.log(`[SUCCESS] Account "${targetEmail}" has been unlocked.`)
  console.log(`Previous lockout details:`, prevRecord)
} catch (err) {
  console.error(`[ERROR] Failed to unlock account:`, err.message)
  process.exit(1)
}
