import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getPortalSettings } from '@/lib/portal-settings'
import FormComingSoon from '@/components/FormComingSoon'
import { canonicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Free Cybersecurity Resources',
  description: 'Community guides, sessions, and hands-on learning resources from Cyber Guardian Society.',
  ...canonicalMetadata('/resources'),
}

export default async function ResourcesPage() {
  const settings = await getPortalSettings()

  if (settings.resources_coming_soon) {
    return (
      <FormComingSoon
        title="Free Resources are coming soon."
        description="We are actively curating open-access cybersecurity guides, session archives, and defensive playbooks. Please check back soon!"
      />
    )
  }

  redirect('/products#resources')
}
