import type { Metadata } from 'next'
import LegalDocument from '@/components/legal/LegalDocument'
import { privacyPolicy } from '@/data/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: privacyPolicy.description,
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return <LegalDocument doc={privacyPolicy} />
}
