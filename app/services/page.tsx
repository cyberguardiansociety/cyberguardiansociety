import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Mail } from 'lucide-react'
import { org, servicesPage } from '@/data/site'
import { MintBanner, PageHero, SectionLabel } from '@/components/ui/PageChrome'
import Container from '@/components/ui/Container'
import ClayButton from '@/components/ui/ClayButton'
import ServicesFaq from '@/components/services/ServicesFaq'
import HeroCollage from '@/components/ui/HeroCollage'
import { canonicalMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Cybersecurity services and readiness',
  description: 'Explore CGS incident readiness, threat intelligence exchange, detection engineering, practical cyber training and coordinated response support.',
  ...canonicalMetadata('/services'),
}

export default function ServicesPage() {
  const s = servicesPage
  return (
    <>
      <main id="main">
        <PageHero
          eyebrow={s.eyebrow}
          headline={s.headline}
          body={s.body}
          primary={s.cta.primaryCta}
          secondary={s.cta.secondaryCta}
          media={
            <HeroCollage
              image={s.image}
              imageAlt="Security operators reviewing an incident response dashboard"
              cards={[
                { eyebrow: 'Readiness', title: s.items[0].title, detail: 'Rehearsals and shared response playbooks.' },
                { eyebrow: 'Intelligence', title: s.items[1].title, detail: 'Indicators paired with trusted context.' },
                { eyebrow: 'Response', title: s.items[5].title, detail: 'Surge coordination when campaigns span members.' },
              ]}
            />
          }
        />

        {/* Service grid section */}
        <section className="section bg-surface">
          <Container>
            {/* Section heading tight to sub */}
            <SectionLabel heading={s.gridHeading} sub={s.gridSub} center />

            {/* Cards — generous gap from heading */}
            <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {s.items.map((item) => (
                <li key={item.title} className="card-surface flex flex-col p-6">
                  {/* Title at top — scannable */}
                  <h3 className="font-display text-lg font-semibold tracking-[-0.02em]">{item.title}</h3>
                  {/* Body close to title */}
                  <p className="mt-2 flex-1 text-sm leading-6 text-ink-muted">{item.body}</p>
                  {/* CTA link separated from body — it's an action */}
                  <Link href={item.href} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-mint hover:underline">
                    Get in touch <ArrowRight size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* FAQ */}
        <ServicesFaq />

        {/* Project inquiry band */}
        <section className="section border-y border-line bg-surface">
          <Container>
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-8">
                {/* Eyebrow tight to heading */}
                <p className="eyebrow">Have a project in mind?</p>
                <h2 className="mt-3 max-w-[38ch] font-heading text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  Tell us what you are building and we will walk you through the options.
                </h2>
                {/* Supporting copy — separated enough to read as detail */}
                <p className="mt-4 max-w-[52ch] text-sm text-ink-muted">
                  No commitment needed. We will discuss your goals, constraints, and which combination of services makes sense.
                </p>
              </div>
              {/* CTAs — right-aligned on large screens, vertically generous */}
              <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
                <ClayButton href={org.contactHref} icon={<ArrowRight size={15} />}>
                  Start the conversation
                </ClayButton>
                <ClayButton
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(org.email)}&su=${encodeURIComponent('Project inquiry for Cyber Guardian Society')}`}
                  variant="secondary"
                  icon={<Mail size={15} />}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Email us directly
                </ClayButton>
              </div>
            </div>
          </Container>
        </section>

        <MintBanner
          heading={s.cta.heading}
          sub={s.cta.sub}
          primary={s.cta.primaryCta}
          secondary={s.cta.secondaryCta}
        />
      </main>
    </>
  )
}
