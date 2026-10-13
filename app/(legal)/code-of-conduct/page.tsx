import type { Metadata } from 'next'
import LegalDocument from '@/components/legal/LegalDocument'
import { codeOfConduct } from '@/data/legal'

export const metadata: Metadata = {
  title: 'Code of Conduct',
  description: codeOfConduct.description,
  alternates: { canonical: '/code-of-conduct' },
}

export default function CodeOfConductPage() {
  return <LegalDocument doc={codeOfConduct} />
}
