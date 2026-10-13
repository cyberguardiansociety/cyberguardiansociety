export type InboxMessageKind = 'contact' | 'membership_interest'
export type InboxMessageStatus = 'new' | 'in_progress' | 'closed'

export interface InboxMessage {
  id?: string
  kind: InboxMessageKind
  name: string
  email: string
  message: string
  metadata?: Record<string, unknown>
  status?: InboxMessageStatus
  created_at?: string
  updated_at?: string
}

export interface JoinApplication {
  reference: string
  submittedAt: string
  personal: {
    fullName: string
    preferredName?: string
    email: string
    phone: string
    country: string
    city: string
  }
  academic: {
    currentStatus: string
    institution: string
    degree?: string
    currentYear?: string
    linkedin?: string
    github?: string
    portfolio?: string
  }
  divisions: {
    selected: string[]
    primary: string
    other?: string
  }
  skills: {
    selected: string[]
    other?: string
    level: string
    yearsExperience?: string
    previousExperience?: string
    projects?: string
    certifications?: string
  }
  cybersecurity?: {
    areas: string[]
    other?: string
  }
  declarations: string[]
  attachments?: {
    cv?: {
      name: string
      size: number
    } | null
  }
}
