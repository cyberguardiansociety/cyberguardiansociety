import { Request, Response, NextFunction, RequestHandler } from 'express'

/**
 * Wraps asynchronous express route handlers to catch uncaught rejections and forward to next(err).
 */
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}
