import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'
import { logger } from '../utils/logger'

/**
 * Centralized global error handling middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isAppError = err instanceof AppError
  const statusCode = isAppError ? err.statusCode : 500
  const code = isAppError ? err.code : 'INTERNAL_SERVER_ERROR'
  const errors = isAppError ? err.errors : undefined

  if (statusCode >= 500) {
    logger.error(`[UnhandledError] ${err.message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    })
  } else {
    logger.warn(`[ClientError ${statusCode}] ${err.message}`, {
      code,
      url: req.originalUrl,
    })
  }

  // Hide internal server details in production
  const safeMessage =
    statusCode >= 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message

  res.status(statusCode).json({
    success: false,
    error: safeMessage,
    code,
    ...(errors ? { errors } : {}),
  })
}
