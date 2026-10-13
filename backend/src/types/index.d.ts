export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
  code?: string
  errors?: Record<string, string>
}

export interface UserSession {
  userId: string
  email: string
  role: string
}
