import type { Metadata } from 'next'
import { testimonialsPage } from '@/data/site'
import { MintBanner, PageHero } from '@/components/ui/PageChrome'

export const metadata: Metadata = {
  title: 'Member stories',
  description: 'Stories from the Cyber Guardian Society community.',
  robots: { index: false, follow: true },
}

export default function TestimonialsPage() {
  const t = testimonialsPage
  return (
    <>
      <main id="main">
        <PageHero
          eyebrow={t.eyebrow}
          headline={t.headline}
          body={t.body}
        />

        <MintBanner
          heading={t.cta.heading}
          sub={t.cta.sub}
          primary={t.cta.primaryCta}
          secondary={t.cta.secondaryCta}
        />
      </main>
    </>
  )
}
