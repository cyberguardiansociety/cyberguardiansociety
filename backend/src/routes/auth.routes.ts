import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { AuthController } from '../controllers/auth.controller'
import { validate } from '../middlewares/validate.middleware'
import { loginValidator } from '../validators/auth.validator'

const router = Router()

// Strict rate limiter for auth: 5 attempts per 15 minutes
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
    code: 'RATE_LIMITED',
  },
})

// Public health check
router.get('/health', AuthController.getHealth)

// Admin login
router.post('/auth/login', authRateLimiter, validate(loginValidator), AuthController.login)

export default router
