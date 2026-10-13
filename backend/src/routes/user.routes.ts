import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { UserController } from '../controllers/user.controller'
import { validate } from '../middlewares/validate.middleware'
import { guardBrowserOrigin } from '../middlewares/auth.middleware'
import { contactValidator, quickJoinValidator } from '../validators/user.validator'

const router = Router()

// Rate limiter: 5 messages per 10 minutes per IP
const contactRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many messages. Please try again later.',
    code: 'RATE_LIMITED',
  },
})

// Rate limiter: 5 applications per hour per IP
const joinRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many applications. Please try again later.',
    code: 'RATE_LIMITED',
  },
})

// Public contact & speaker proposals
router.post(
  '/contact',
  guardBrowserOrigin,
  contactRateLimiter,
  validate(contactValidator),
  UserController.handleContact
)

// Public quick membership interest
router.post(
  '/join',
  guardBrowserOrigin,
  joinRateLimiter,
  validate(quickJoinValidator),
  UserController.handleQuickJoin
)

export default router
