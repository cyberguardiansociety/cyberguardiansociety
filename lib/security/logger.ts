import winston from 'winston'
import path from 'path'
import fs from 'fs'

const rootDir = process.cwd()
const logsDir = path.join(rootDir, 'logs')
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const CNIC_PATTERN = /\b\d{5}-\d{7}-\d\b/g
const SENSITIVE_FIELD_PATTERN = /(?:email|e-mail|phone|mobile|address|cnic|national.?id|id.?card|passport)/i

function redactSensitiveText(value: string): string {
  return value.replace(CNIC_PATTERN, '[REDACTED_ID]').replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
}

function redactSensitiveMetadata(value: unknown, key = ''): unknown {
  if (key && SENSITIVE_FIELD_PATTERN.test(key)) return '[REDACTED]'
  if (typeof value === 'string') return redactSensitiveText(value)
  if (Array.isArray(value)) return value.map((item) => redactSensitiveMetadata(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        redactSensitiveMetadata(childValue, childKey),
      ]),
    )
  }
  return value
}

if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true })
  } catch {}
}

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'ACCOUNT_LOCKOUTS_CLEARED'
  | '2FA_CHALLENGE'
  | '2FA_SUCCESS'
  | '2FA_FAILED'
  | '2FA_RECOVERY_USED'
  | '2FA_ENROLLED'
  | '2FA_RESET'
  | 'LOGOUT'
  | 'HONEYPOT_HIT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED_ACCESS'
  | 'IP_BLOCKED'

export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'cgs-security-gateway' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'security-audit.log'),
      level: 'info',
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'security-alerts.log'),
      level: 'warn',
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, event, ip, user, ...rest }) => {
          const userStr = user ? ` [user=${user}]` : ''
          const ipStr = ip ? ` [ip=${ip}]` : ''
          const eventStr = event ? ` [event=${event}]` : ''
          const restStr = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : ''
          return `[${timestamp}] ${level}:${eventStr}${userStr}${ipStr} ${message}${restStr}`
        }),
      ),
    }),
  ],
})

export function logSecurityEvent(
  eventType: SecurityEventType,
  message: string,
  meta: {
    ip?: string
    user?: string
    userAgent?: string
    path?: string
    details?: Record<string, unknown>
    severity?: 'info' | 'warn' | 'error'
  } = {},
) {
  const { ip, user, userAgent, path: reqPath, details, severity = 'info' } = meta

  const payload = redactSensitiveMetadata({
    event: eventType,
    ip: ip || 'unknown',
    user: user ? user.slice(0, 100) : undefined,
    userAgent: userAgent ? userAgent.slice(0, 300) : undefined,
    path: reqPath,
    ...details,
  }) as Record<string, unknown>
  const safeMessage = redactSensitiveText(message)

  if (severity === 'error') {
    securityLogger.error(safeMessage, payload)
  } else if (severity === 'warn') {
    securityLogger.warn(safeMessage, payload)
  } else {
    securityLogger.info(safeMessage, payload)
  }
}
