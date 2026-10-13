import type { Metadata } from 'next'
import { canonicalMetadata } from '@/lib/seo'
import FormComingSoon from '@/components/FormComingSoon'
import { getPortalSettings } from '@/lib/portal-settings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Join Cyber Guardian Society',
  description: 'Apply to join the Cyber Guardian Society, an independent student-led cybersecurity community for practitioners who want to learn, share and strengthen collective defense.',
  ...canonicalMetadata('/join-cgs'),
}

export default async function JoinCgsLayout({ children }: { children: React.ReactNode }) {
  try {
    const settings = await getPortalSettings()
    if (settings.join_cgs_coming_soon) {
      return <FormComingSoon title="CGS applications are coming soon." description="The membership application is temporarily closed. Please check back soon for updates." />
    }
    return children
  } catch {
    return <FormComingSoon title="Applications are temporarily unavailable." description="We cannot load the application right now. Please check back soon." />
  }
}
