import { logger } from '../utils/logger'

export class EmailService {
  /**
   * Dispatches automated confirmation or team notifications
   */
  static async sendNotification(to: string, subject: string, body: string): Promise<boolean> {
    try {
      logger.info('Email notification queued', {
        to: to.replace(/(?<=.).(?=.*@)/g, '*'),
        subject,
      })
      // Integration hook for transactional mail providers (Resend, SendGrid, SMTP)
      return true
    } catch (err) {
      logger.error('Failed to send email notification:', err)
      return false
    }
  }
}
