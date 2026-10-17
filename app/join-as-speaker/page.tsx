import type { Metadata } from 'next'
import { ArrowRight, Presentation, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import Container from '@/components/ui/Container'
import SpeakerApplicationForm from '@/components/SpeakerApplicationForm'
import { canonicalMetadata } from '@/lib/seo'
import FormComingSoon from '@/components/FormComingSoon'
import { getPortalSettings } from '@/lib/portal-settings'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Join as a speaker',
  description: 'Propose a practical cybersecurity session for the Cyber Guardian Society community.',
  ...canonicalMetadata('/join-as-speaker'),
}

const expectations = [
  'Share practical lessons, not promotional pitches.',
  'Keep examples authorized and protect private information.',
  'Make the session useful to practitioners at different levels.',
]

export default async function JoinAsSpeakerPage() {
  let comingSoon = true
  try {
    comingSoon = (await getPortalSettings()).speaker_coming_soon
  } catch {
    return <FormComingSoon title="Speaker applications are temporarily unavailable." description="We cannot load the speaker application right now. Please check back soon." />
  }
  if (comingSoon) {
    return <FormComingSoon title="Speaker applications are coming soon." description="Speaker proposals are temporarily closed. Please check back soon for updates." />
  }

  return (
    <main id="main" className="speaker-page hero-world-map">
      <Container>
        <div className="speaker-layout">
          <section className="speaker-intro" aria-labelledby="speaker-heading">
            <p className="eyebrow inline-flex items-center gap-2"><Presentation size={14} /> Community sessions</p>
            <h1 id="speaker-heading">Bring what you know to the room.</h1>
            <p className="speaker-intro__body">CGS sessions are practical, peer-led, and grounded in real defensive work. Tell us what you’d like to teach; we’ll help shape the format together.</p>
            <div className="speaker-expectations">
              <p><ShieldCheck size={16} /> What we look for</p>
              <ul>{expectations.map((expectation) => <li key={expectation}>{expectation}</li>)}</ul>
            </div>
            <Link href="/#sessions" className="speaker-sessions-link">See current sessions <ArrowRight size={15} /></Link>
          </section>
          <SpeakerApplicationForm />
        </div>
      </Container>
    </main>
  )
}
