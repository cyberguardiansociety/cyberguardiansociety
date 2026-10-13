import { selectOne } from '../../../lib/db'
import { verifyPassword } from '../../../lib/security/password'
import { logger } from '../utils/logger'

export class AuthService {
  /**
   * Verifies email/username + password against the local admin_users table and
   * confirms the account is active before returning its role.
   */
  static async verifyAdmin(identifier: string, password: string): Promise<{ valid: boolean; role?: string }> {
    try {
      const normalizedIdentifier = String(identifier ?? '').trim().toLowerCase()
      const result = await selectOne<{
        password_hash: string
        role: string
        active: boolean | number
      }>(
        'admin_users',
        '(lower(email) = ? OR lower(username) = ?)',
        [normalizedIdentifier, normalizedIdentifier],
      )

      const data = result.data?.[0]
      if (!result.success || !data) return { valid: false }
      if (!(data.active === true || data.active === 1)) return { valid: false }

      const passwordOk = await verifyPassword(String(password ?? ''), String(data.password_hash ?? ''))
      if (!passwordOk) return { valid: false }

      return { valid: true, role: String(data.role ?? 'super_admin') }
    } catch (err) {
      logger.error('Admin verification error:', err)
      return { valid: false }
    }
  }
}
