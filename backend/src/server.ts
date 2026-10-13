import { createServer } from 'http'
import app from './app'
import { config } from './config/env'
import { checkDbHealth } from './config/db'
import { logger } from './utils/logger'

const server = createServer(app)

const PORT = config.port

// Start server
server.listen(PORT, async () => {
  logger.info(`🛡️ Cyber Guardian Society API Server running on port ${PORT} (${config.env})`)
  const isDbConnected = await checkDbHealth()
  if (isDbConnected) {
    logger.info('Database connection established successfully.')
  } else {
    logger.warn('Database connection could not be verified on startup.')
  }
})

// Graceful shutdown handling
const handleShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down HTTP server gracefully...`)
  server.close(() => {
    logger.info('HTTP server closed.')
    process.exit(0)
  })

  // Force close after 10s if connections remain open
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down.')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGINT', () => handleShutdown('SIGINT'))

export { server, app }
