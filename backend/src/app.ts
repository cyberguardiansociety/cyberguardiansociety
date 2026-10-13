import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { config } from './config/env'
import routes from './routes'
import { errorHandler } from './middlewares/error.middleware'
import { AppError } from './utils/AppError'
import { getDbClient } from './config/db'
import { readMaintenanceSnapshot, writeMaintenanceSnapshot } from '../../lib/maintenance-state'
import { isSupabaseRuntimeConfigured } from '../../lib/supabase/config'

const app = express()

// 1. Security Headers
app.use(helmet())

// 2. CORS Configuration
const allowedOrigins = new Set(config.corsOrigins)
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin))
    },
    credentials: true,
  })
)

// 3. Body Parsing with Safe Limits
app.use(express.json({ limit: '32kb', strict: true }))
app.use(express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 20 }))

// Keep monitoring and administrator authentication available while the public
// services are in maintenance mode.
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health' || req.path === '/api/auth/login' || req.method === 'OPTIONS') {
    return next()
  }

  try {
    const hostedDatabase = isSupabaseRuntimeConfigured()
    let maintenance = hostedDatabase ? null : readMaintenanceSnapshot()
    if (!maintenance) {
      const { data, error } = await getDbClient()
        .from('cgs_portal_settings')
        .select('key, value')
        .in('key', ['maintenance_mode', 'maintenance_message'])
      if (error) {
        return res.status(503).json({
          success: false,
          error: 'The service is temporarily unavailable.',
          code: 'SERVICE_UNAVAILABLE',
        })
      }

      const settings = new Map<string, unknown>()
      for (const row of data ?? []) {
        if (typeof row.key === 'string') settings.set(row.key, row.value)
      }
      const storedMessage = settings.get('maintenance_message')
      const nextMaintenance = {
        enabled: settings.get('maintenance_mode') === 'true',
        message: typeof storedMessage === 'string' && storedMessage.trim()
          ? storedMessage.trim()
          : 'Our website is temporarily unavailable while we complete scheduled maintenance. Please check back soon.',
      }
      maintenance = hostedDatabase ? nextMaintenance : writeMaintenanceSnapshot(nextMaintenance)
    }

    if (maintenance.enabled) {
      return res.status(503).json({ success: false, error: maintenance.message, code: 'MAINTENANCE_MODE' })
    }
  } catch {
    return res.status(503).json({
      success: false,
      error: 'The service is temporarily unavailable.',
      code: 'SERVICE_UNAVAILABLE',
    })
  }

  return next()
})

// 4. Global API Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMITED',
  },
})
app.use('/api/', globalLimiter)

// 5. Mount Application Routes
app.use(routes)

// 6. Handle 404 Unhandled Routes
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl} on this server.`, 404, 'NOT_FOUND'))
})

// 7. Global Error Handler
app.use(errorHandler)

export default app
