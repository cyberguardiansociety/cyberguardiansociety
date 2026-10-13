import type { Metadata } from 'next'
import { canonicalMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Contact Cyber Guardian Society',
  description: 'Contact CGS about cybersecurity services, membership, partnerships, community sessions or general questions. The team aims to reply within two business days.',
  ...canonicalMetadata('/contact'),
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
