import type { Metadata } from 'next'
import { Activity, ArrowRight, CalendarDays, Check, Cloud, Lock, Server, Radar, ShieldCheck, Users, Zap } from 'lucide-react'
import Link from 'next/link'
import { productsPage } from '@/data/site'
import { MintBanner, SectionLabel } from '@/components/ui/PageChrome'
import Container from '@/components/ui/Container'
import ClayButton from '@/components/ui/ClayButton'
import ManagedContentCards from '@/components/ManagedContentCards'
import { readPublicManagedContent } from '@/lib/site-content'
import { canonicalMetadata } from '@/lib/seo'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Cybersecurity tools and learning resources',
  description: 'Discover security tools, community resources and practical learning paths built around threat intelligence, incident response and defensive security.',
  ...canonicalMetadata('/products'),
}

const promiseIcons = [Cloud, Lock, Server, Activity]

const flowIcons = { collect: Radar, context: ShieldCheck, act: Zap, share: Users } as const

const freeResources = [
  {
    title: 'Online sessions',
    body: 'Find current briefings and upcoming session dates from the CGS community.',
    href: '/#sessions',
    action: 'View sessions',
    icon: CalendarDays,
  },
  {
    title: 'Cyber training',
    body: 'Explore hands-on labs and training tracks built around practical defense.',
    href: '/services',
    action: 'Explore services',
    icon: Zap,
  },
  {
    title: 'About the society',
    body: 'Learn how CGS members share knowledge and strengthen collective defense.',
    href: '/about',
    action: 'Meet CGS',
    icon: Users,
  },
]

export default async function ProductsPage() {
  const p = productsPage
  const [managedProducts, managedResources] = await Promise.all([
    readPublicManagedContent('product'),
    readPublicManagedContent('resource'),
  ])
  return (
    <>
      <main id="main">
        {/*
          Hero rebuilt from scratch. No logo, no photography — the copy sits left and a
          "signal path" ladder carries the right, so the CGS mark stays reserved for the
          navbar, the footer and the browser tab.
        */}
        <section className="hero-world-map relative overflow-hidden border-b border-line">
          <Container className="relative">
            <div className="grid gap-12 pb-14 pt-8 sm:pb-18 sm:pt-10 lg:grid-cols-12 lg:items-center lg:gap-14 lg:pb-24 lg:pt-14">
              <div className="products-hero-copy rise lg:col-span-7">
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-mint">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" />
                  {p.eyebrow}
                </span>
                <h1 className="mt-6 max-w-[15ch] font-heading text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[52px] lg:text-[62px]">
                  {p.headline}
                </h1>
                <p className="mt-6 max-w-[54ch] text-[16px] leading-7 text-ink-muted sm:text-[17px]">
                  {p.body}
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <ClayButton href={p.primaryCta.href}>{p.primaryCta.label}</ClayButton>
                  <ClayButton href={p.secondaryCta.href} variant="secondary">
                    {p.secondaryCta.label}
                  </ClayButton>
                </div>

                <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-6">
                  {p.heroMarks.map((mark) => (
                    <li key={mark} className="flex items-center gap-2 text-sm text-ink-muted">
                      <Check size={15} className="shrink-0 text-mint" strokeWidth={2.25} />
                      {mark}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rise rise--panel lg:col-span-5">
                <div className="relative overflow-hidden rounded-panel border border-line bg-surface p-6 shadow-none sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-ink-muted">
                      Signal path
                    </p>
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-mint"
                    />
                  </div>

                  <ol className="mt-6 space-y-5">
                    {p.flow.map((step, i) => {
                      const Icon = flowIcons[step.icon as keyof typeof flowIcons]
                      return (
                        <li key={step.title} className="relative flex gap-4">
                          {/* connector rail, omitted on the last step */}
                          {i < p.flow.length - 1 ? (
                            <span
                              aria-hidden="true"
                              className="absolute left-3.75 top-9 h-[calc(100%+0.5rem)] w-px bg-mint"
                            />
                          ) : null}

                          <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-mint">
                            <Icon size={15} strokeWidth={2} />
                          </span>
                          <div className="min-w-0 pt-0.5">
                            <p className="font-display text-[15px] font-semibold tracking-[-0.01em]">
                              <span className="mr-2 font-sans text-[11px] font-medium tabular-nums text-mint">
                                0{i + 1}
                              </span>
                              {step.title}
                            </p>
                            <p className="mt-1 text-[13px] leading-[1.55] text-ink-muted">
                              {step.body}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ol>

                  <p className="mt-7 border-t border-line pt-4 text-[11px] uppercase tracking-[0.3em] text-ink-muted">
                    {p.heroNote}
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {managedProducts.length ? (
          <section className="section">
            <Container>
              <SectionLabel eyebrow="CGS products" heading="Tools from the team." />
              <ManagedContentCards items={managedProducts} />
            </Container>
          </section>
        ) : null}

        <section className="section">
          <Container>
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <SectionLabel eyebrow={p.promise.eyebrow} heading={p.promise.headline} />
                <p className="mt-4 text-ink-muted">{p.promise.body}</p>
              </div>
              <ul className="space-y-5 lg:col-span-7">
                {p.promise.items.map((item, i) => {
                  const Icon = promiseIcons[i] ?? Cloud
                  return (
                    <li key={item.title} className="flex gap-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-mint text-on-mint">
                        <Icon size={18} />
                      </span>
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </Container>
        </section>

        <section id="resources" className="section border-y border-line bg-surface">
          <Container>
            <SectionLabel
              eyebrow="Learn with CGS"
              heading="Free Resources"
              sub="Public sessions, learning paths, and information from the Cyber Guardian Society community."
            />
            {managedResources.length ? (
              <ManagedContentCards items={managedResources} />
            ) : (
              <ul className="mt-8 grid gap-4 md:grid-cols-3">
                {freeResources.map((resource) => {
                  const Icon = resource.icon
                  return (
                    <li key={resource.title} className="card-surface flex flex-col p-6">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-mint text-on-mint">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <h3 className="mt-5 font-display text-lg font-semibold tracking-[-0.02em]">
                        {resource.title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-6 text-ink-muted">
                        {resource.body}
                      </p>
                      <Link
                        href={resource.href}
                        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-mint hover:underline"
                      >
                        {resource.action} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Container>
        </section>

        <MintBanner
          heading={p.cta.heading}
          sub={p.cta.sub}
          primary={p.cta.primaryCta}
          secondary={p.cta.secondaryCta}
        />
      </main>
    </>
  )
}
