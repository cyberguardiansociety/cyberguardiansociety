import { Request, Response, NextFunction } from 'express'
import { config } from '../config/env'
import { AppError } from '../utils/AppError'

const allowedOriginsSet = new Set(config.corsOrigins)

/**
 * Guards routes against unapproved browser cross-origins
 */
export function guardBrowserOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin')
  if (origin && !allowedOriginsSet.has(origin)) {
    return next(new AppError('Request origin is not allowed.', 403, 'ORIGIN_NOT_ALLOWED'))
  }
  next()
}

/**
 * Validates admin session authentication
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required to access this resource.', 401, 'UNAUTHORIZED'))
  }
  next()
}
