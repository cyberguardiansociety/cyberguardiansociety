#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const target = process.argv[2]?.trim().toLowerCase()

if (!target) {
  console.error('Usage: node scripts/reset-2fa.js <admin-email-or-userId>')
  process.exit(1)
}

const dataDir = path.join(process.cwd(), 'data')
const storeFile = path.join(dataDir, 'admin-2fa-store.json')

if (!fs.existsSync(storeFile)) {
  console.log(`No 2FA enrollment store found at ${storeFile}.`)
  process.exit(0)
}

try {
  const raw = fs.readFileSync(storeFile, 'utf-8')
  const store = JSON.parse(raw)

  let matchedKey = null
  for (const [key, val] of Object.entries(store)) {
    if (key.toLowerCase() === target || val.email?.toLowerCase() === target) {
      matchedKey = key
      break
    }
  }

  if (!matchedKey) {
    console.log('No legacy TOTP enrollment record was found for the supplied account.')
    process.exit(0)
  }
  delete store[matchedKey]

  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2), 'utf-8')

  console.log('[SUCCESS] Legacy TOTP enrollment data was cleared.')
  console.log('Admin sign-in uses email and password; clearing this legacy record does not change login credentials.')
} catch (err) {
  console.error(`[ERROR] Failed to reset 2FA:`, err.message)
  process.exit(1)
}
