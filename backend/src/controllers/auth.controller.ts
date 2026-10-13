import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service'
import { checkDbHealth } from '../config/db'
import { catchAsync } from '../utils/catchAsync'
import { AppError } from '../utils/AppError'

export class AuthController {
  /**
   * Health check endpoint
   * GET /health
   */
  static getHealth = catchAsync(async (_req: Request, res: Response) => {
    const dbHealthy = await checkDbHealth()
    res.status(200).json({
      status: 'ok',
      service: 'Cyber Guardian Society Backend API',
      database: dbHealthy ? 'connected' : 'unreachable',
      timestamp: new Date().toISOString(),
    })
  })

  /**
   * Admin login endpoint
   * POST /api/auth/login
   */
  static login = catchAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body
    const result = await AuthService.verifyAdmin(email, password)

    if (!result.valid) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS')
    }

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      role: result.role,
    })
  })
}
