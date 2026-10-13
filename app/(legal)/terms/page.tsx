import type { Metadata } from 'next'
import LegalDocument from '@/components/legal/LegalDocument'
import { termsOfService } from '@/data/legal'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: termsOfService.description,
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return <LegalDocument doc={termsOfService} />
}
