import { Router } from 'express'
import userRoutes from './user.routes'
import authRoutes from './auth.routes'

const router = Router()

// Mount routes
router.use('/', authRoutes)
router.use('/api', userRoutes)

export default router
