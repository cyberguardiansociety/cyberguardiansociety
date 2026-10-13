import type { Metadata } from 'next'
import Hero from '@/components/home/Hero'
import TrustedCommons from '@/components/home/TrustedCommons'
import Sessions from '@/components/home/Sessions'
import Capabilities from '@/components/home/Capabilities'
import FinalCta from '@/components/home/FinalCta'
import { canonicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...canonicalMetadata('/'),
}

export default function HomePage() {
  return (
    <>
      <main id="main">
        <Hero />
        <TrustedCommons />
        <Sessions />
        <Capabilities />
        <FinalCta />
      </main>
    </>
  )
}
