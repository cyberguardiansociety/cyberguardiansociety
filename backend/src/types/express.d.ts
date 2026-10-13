import { UserSession } from './index'

declare global {
  namespace Express {
    interface Request {
      user?: UserSession
      clientIp?: string
      validatedData?: unknown
    }
  }
}

export {}
