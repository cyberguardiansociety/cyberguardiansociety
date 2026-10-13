/**
 * Custom operational error class for standard HTTP error responses.
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly status: 'fail' | 'error'
  public readonly isOperational: boolean
  public readonly code?: string
  public readonly errors?: Record<string, string>

  constructor(
    message: string,
    statusCode = 400,
    code = 'ERROR',
    errors?: Record<string, string>
  ) {
    super(message)
    this.statusCode = statusCode
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = true
    this.code = code
    this.errors = errors

    Error.captureStackTrace(this, this.constructor)
  }
}
