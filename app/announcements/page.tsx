import type { Metadata } from 'next'
import Container from '@/components/ui/Container'
import AnnouncementRows from '@/components/AnnouncementRows'
import { readPublicManagedContent } from '@/lib/site-content'
import { canonicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Announcements',
  description: 'News and updates from the Cyber Guardian Society community.',
  ...canonicalMetadata('/announcements'),
}

export default async function AnnouncementsPage() {
  const announcements = await readPublicManagedContent('announcement')

  return (
    <main id="main" className="announcement-page hero-world-map">
      <Container>
        <header className="announcement-page__intro">
          <p className="eyebrow">From the society</p>
          <h1>Announcements</h1>
          <p>Updates, opportunities, and news from the CGS community.</p>
        </header>
        {announcements.length ? (
          <AnnouncementRows items={announcements} />
        ) : (
          <p className="announcement-empty">There are no announcements right now. Check back for community updates.</p>
        )}
      </Container>
    </main>
  )
}

