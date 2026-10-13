import type { ReactNode } from 'react'
import Link from 'next/link'
import ClayButton from '@/components/ui/ClayButton'
import Container from '@/components/ui/Container'

export function PageHero({
  eyebrow,
  headline,
  body,
  media,
  primary,
  secondary,
  below,
}: {
  eyebrow: string
  headline: string
  body: string
  media?: ReactNode
  primary?: { label: string; href: string }
  secondary?: { label: string; href: string }
  below?: ReactNode
}) {
  return (
    <section className="hero-world-map section--tight pt-10 sm:pt-14">
      <Container>
        <div className={`grid min-w-0 grid-cols-1 items-center gap-10 ${media ? 'lg:grid-cols-12 lg:gap-12' : ''}`}>
          <div className={`min-w-0 ${media ? 'lg:col-span-6' : 'max-w-3xl'}`}>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-4 max-w-[16ch] font-heading text-[clamp(30px,9vw,40px)] font-semibold leading-[1.08] tracking-[-0.03em] wrap-anywhere sm:text-[52px]">
              {headline}
            </h1>
            <p className="mt-5 max-w-[50ch] text-ink-muted">{body}</p>
            {primary || secondary ? (
              <div className="mt-8 flex flex-wrap gap-3">
                {primary ? <ClayButton href={primary.href}>{primary.label}</ClayButton> : null}
                {secondary ? (
                  <ClayButton href={secondary.href} variant="secondary">
                    {secondary.label}
                  </ClayButton>
                ) : null}
              </div>
            ) : null}
          </div>
          {media ? <div className="min-w-0 lg:col-span-6">{media}</div> : null}
        </div>
        {below ? <div className="mt-10">{below}</div> : null}
      </Container>
    </section>
  )
}

export function MintBanner({
  heading,
  sub,
  primary,
  secondary,
}: {
  heading: string
  sub?: string
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
}) {
  return (
    <section className="section--tight pb-20">
      <Container>
        <div className="mint-cta on-mint flex flex-col gap-8 px-8 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-12 sm:py-12">
          <div className="max-w-xl">
            <h2 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-mint-on sm:text-4xl">
              {heading}
            </h2>
            {sub ? <p className="mt-3 text-sm leading-6 text-mint-on sm:text-base">{sub}</p> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <ClayButton href={primary.href} variant="brass">
              {primary.label}
            </ClayButton>
            {secondary ? (
              <ClayButton href={secondary.href} variant="neutral">
                {secondary.label}
              </ClayButton>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  )
}

export function SectionLabel({
  eyebrow,
  heading,
  sub,
  center,
}: {
  eyebrow?: string
  heading: string
  sub?: string
  center?: boolean
}) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : ''}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2
        className={`font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl ${eyebrow ? 'mt-3' : ''}`}
      >
        {heading}
      </h2>
      {sub ? <p className="mt-3 text-ink-muted">{sub}</p> : null}
    </div>
  )
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-semibold text-mint hover:underline">
      {children}
    </Link>
  )
}
