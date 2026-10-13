import { Request, Response, NextFunction } from 'express'
import { ZodTypeAny, ZodError } from 'zod'
import { AppError } from '../utils/AppError'

/**
 * Reusable Zod schema validation middleware for Express routes.
 * Parses and replaces req.body with sanitized, validated data.
 */
export const validate = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body)
      req.body = parsed
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {}
        for (const issue of err.issues) {
          const field = issue.path[0] ? String(issue.path[0]) : 'form'
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message
          }
        }
        return next(
          new AppError('Please correct the highlighted fields.', 400, 'VALIDATION', fieldErrors)
        )
      }
      next(err)
    }
  }
}
