#!/usr/bin/env node
const crypto = require('crypto')

const randomSlug = crypto.randomBytes(16).toString('hex')
const secretPath = `/cgs-ops-${randomSlug}`

console.log('='.repeat(60))
console.log('Generated Cryptographically Secure Admin Base Path:')
console.log('='.repeat(60))
console.log(`ADMIN_BASE_PATH=${secretPath}`)
console.log('='.repeat(60))
console.log('Add this line to your production .env or hosting environment variables.')
console.log('Do not commit the generated path into public git repositories.')
