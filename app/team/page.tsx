import type { Metadata } from 'next'
import { teamPage } from '@/data/site'
import TeamHeader from '@/components/team/TeamHeader'
import OrgChart from '@/components/team/OrgChart'
import JoinBanner from '@/components/team/JoinBanner'
import NewsletterBand from '@/components/team/NewsletterBand'
import { canonicalMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Our team',
  description: teamPage.body,
  ...canonicalMetadata('/team'),
}

export default function TeamPage() {
  return (
    <main id="main" className="team-page min-h-screen text-ink">
      <TeamHeader />
      <OrgChart />
      <JoinBanner />
      <NewsletterBand />
    </main>
  )
}
