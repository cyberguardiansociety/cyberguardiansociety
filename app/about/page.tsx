import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { aboutPage } from '@/data/site'
import { MintBanner, PageHero, SectionLabel } from '@/components/ui/PageChrome'
import HeroCollage from '@/components/ui/HeroCollage'
import Container from '@/components/ui/Container'
import { canonicalMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'About our cybersecurity community',
  description: 'Meet Cyber Guardian Society, an independent student-led community where security practitioners share knowledge, build defensive skills and strengthen collective cyber defense.',
  ...canonicalMetadata('/about'),
}

const strictRules = [
  { id: '01', title: 'Written authorization is mandatory', body: 'Do not scan, test, access, or modify any system unless you have explicit written permission and a defined scope.' },
  { id: '02', title: 'Stay inside the agreed scope', body: 'No disruption, persistence, data extraction, credential use, or testing of third-party systems. Stop immediately if scope is unclear.' },
  { id: '03', title: 'Protect information', body: 'Collect the minimum necessary evidence. Keep client, member, and incident details confidential; never post them in public channels.' },
  { id: '04', title: 'Handle findings responsibly', body: 'Report security issues through the agreed private channel. Do not publish details or proof-of-concept material before authorization.' },
  { id: '05', title: 'Be honest and respectful', body: 'No fabricated findings, impersonation, harassment, discrimination, threats, or retaliation against any community member.' },
  { id: '06', title: 'Follow the law and platform rules', body: 'Every member is responsible for complying with applicable laws, contracts, and the rules of the systems they use.' },
  { id: '07', title: 'Violations have consequences', body: 'CGS may suspend access, remove membership, preserve relevant records, and refer serious suspected illegal activity to the appropriate authorities.' },
]

export default function AboutPage() {
  const a = aboutPage
  return (
    <>
      <main id="main">
        <PageHero
          eyebrow={a.eyebrow}
          headline={a.headline}
          body={a.body}
          primary={a.cta.primaryCta}
          secondary={a.cta.secondaryCta}
          media={
            <HeroCollage
              image={a.image}
              imageAlt="Cyber Guardian Society members collaborating around a table"
              cards={[
                { eyebrow: 'Governance', title: 'Independent student-led', detail: 'No shareholders or sponsors.' },
                { eyebrow: 'Founded', title: 'Since 2018', detail: 'Built by practising defenders.' },
                { eyebrow: 'Membership', title: 'Open by design', detail: 'Applications reviewed by peers.' },
              ]}
            />
          }
          below={
            <dl className="grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
              {a.heroMeta.map((item) => (
                <div key={item.value}>
                  <dt className="font-display text-[17px] font-semibold tracking-[-0.02em]">
                    {item.value}
                  </dt>
                  {/* Label tight to value — they are the same unit */}
                  <dd className="mt-1 text-sm text-ink-muted">{item.label}</dd>
                </div>
              ))}
            </dl>
          }
        />

        {/* Why we exist — two-column layout */}
        <section className="section border-t border-line">
          <Container>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-5">
                <SectionLabel eyebrow={a.why.eyebrow} heading={a.why.headline} />
                {/* CTA link gets generous top separation — it's an action */}
                <Link href={a.why.link.href} className="mt-5 inline-block text-sm font-semibold text-mint hover:underline">
                  {a.why.link.label}
                </Link>
              </div>
              <div className="lg:col-span-7">
                {/* Body copy centered vertically against the heading column */}
                <p className="text-ink-muted lg:pt-2">{a.why.body}</p>
              </div>
            </div>
          </Container>
        </section>

        {/* Principles — scannable cards */}
        <section id="principles" className="section bg-surface">
          <Container>
            <SectionLabel eyebrow={a.principles.eyebrow} heading={a.principles.headline} sub={a.principles.sub} center />
            {/* Cards — generous gap from heading */}
            <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {a.principles.items.map((item) => (
                <li key={item.id} className="card-surface p-6">
                  {/* Number label — small, mint, tight to title */}
                  <p className="text-xs font-semibold tracking-widest text-mint">{item.id}</p>
                  {/* Title close to number — same cognitive unit */}
                  <h3 className="mt-3 font-display text-[17px] font-semibold tracking-[-0.02em]">
                    {item.title}
                  </h3>
                  {/* Body close to title */}
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        <section id="community-rules" className="section border-t border-line">
          <Container>
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-14">
              <div className="lg:col-span-4">
                <p className="eyebrow">Community rules</p>
                <h2 className="mt-3 max-w-[14ch] font-heading text-3xl font-semibold sm:text-4xl">Clear boundaries. No exceptions.</h2>
                <p className="mt-4 max-w-[42ch] text-sm leading-6 text-ink-muted">Membership depends on protecting people, systems, and trust. These standards apply to every CGS space and activity.</p>
                <Link href="/code-of-conduct" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-mint hover:underline">
                  Read the full Code of Conduct <ArrowRight size={15} />
                </Link>
              </div>
              <ol className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:col-span-8">
                {strictRules.map((rule) => (
                  <li key={rule.id} className="bg-bg p-5 sm:p-6">
                    <p className="text-xs font-bold tracking-[0.12em] text-mint">RULE {rule.id}</p>
                    <h3 className="mt-3 text-base font-semibold">{rule.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">{rule.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Container>
        </section>

        <MintBanner
          heading={a.cta.heading}
          sub={a.cta.sub}
          primary={a.cta.primaryCta}
          secondary={a.cta.secondaryCta}
        />
      </main>
    </>
  )
}
