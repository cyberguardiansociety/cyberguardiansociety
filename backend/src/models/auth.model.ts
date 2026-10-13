export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'content_manager'
  | 'session_manager'
  | 'speaker_manager'
  | 'finance_manager'
  | 'inbox_manager'
  | 'auditor'
  | 'limited_admin'

export interface AdminUser {
  userId: string
  email: string
  role: AdminRole
  active: boolean
  permissionKeys: string[]
  createdAt: string
  updatedAt: string
}
