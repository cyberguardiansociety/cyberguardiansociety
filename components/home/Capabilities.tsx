import Link from 'next/link'
import { ArrowUpRight, Flag, ScanSearch, Shield } from 'lucide-react'
import { capabilities } from '@/data/site'
import ClayButton from '@/components/ui/ClayButton'
import Container from '@/components/ui/Container'

const iconMap = {
  shield: Shield,
  scan: ScanSearch,
  flag: Flag,
  wrench: Shield,
  users: Shield,
  network: Shield,
} as const

export default function Capabilities() {
  return (
    <section className="section bg-surface" aria-labelledby="capabilities-heading">
      <Container>
        {/* Heading group — eyebrow tight to heading, sub pulled slightly further */}
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="capabilities-heading"
            className="font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl"
          >
            {capabilities.heading}
          </h2>
          {/* Sub sits closer to heading than to cards — clarifies the relationship */}
          <p className="mt-4 text-ink-muted">{capabilities.sub}</p>
        </div>

        {/* Cards — more top margin to separate section header from content */}
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.items.map((item) => {
            const Icon = iconMap[item.icon] ?? Shield
            return (
              <li key={item.key} className="card-surface group flex flex-col p-6 transition-colors hover:border-mint">
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-mint text-on-mint">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <ArrowUpRight
                    size={18}
                    className="text-ink-muted transition-colors group-hover:text-mint"
                  />
                </div>
                {/* Title sits close to icon — they belong together */}
                <h3 className="mt-5 font-display text-lg font-semibold tracking-[-0.02em]">
                  {item.title}
                </h3>
                {/* Body copy right below title */}
                <p className="mt-2 flex-1 text-sm leading-6 text-ink-muted">{item.body}</p>
                {/* CTA link gets generous separation — it's an action, not a label */}
                <Link
                  href={item.href}
                  className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-mint hover:underline"
                >
                  {item.linkLabel}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Band — separated from cards with tighter vertical padding to feel like a footer to the section */}
        <div className="mt-10 flex flex-col gap-5 rounded-panel border border-line bg-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
          <p className="text-sm text-ink-muted">{capabilities.band.label}</p>
          <ClayButton href={capabilities.band.cta.href}>{capabilities.band.cta.label}</ClayButton>
        </div>
      </Container>
    </section>
  )
}
