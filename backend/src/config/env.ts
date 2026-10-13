import dotenv from 'dotenv'
import path from 'path'

// Resolve environment variables from root
const rootDir = process.cwd()
dotenv.config({ path: path.join(rootDir, '.env.local') })
dotenv.config({ path: path.join(rootDir, '.env') })

const portNum = Number(process.env.BACKEND_PORT ?? 5001)

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535 ? portNum : 5001,
  corsOrigins: (
    process.env.CORS_ORIGINS ?? (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : '')
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const
