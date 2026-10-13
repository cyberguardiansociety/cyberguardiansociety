import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Mail, MapPin } from 'lucide-react'
import { footer, org, socials } from '@/data/site'
import Container from '@/components/ui/Container'
import SocialSelector from '@/components/smoothui/components/social-selector'
import FooterBanner from '@/components/layout/FooterBanner'
import ClayButton from '@/components/ui/ClayButton'

type FooterProps = {
  showBanner?: boolean
}

export default function Footer({ showBanner = true }: FooterProps) {
  return (
    <footer className="pb-6 pt-12 sm:pt-16">
      <Container>
        <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-none">
          {/* ── CTA band ───────────────────────────────────────────── */}
          <FooterBanner show={showBanner} />

          {/* ── Main grid ──────────────────────────────────────────── */}
          <div className="grid gap-10 px-6 py-10 sm:px-10 lg:grid-cols-12 lg:gap-8 lg:py-12">
            {/* Brand column */}
            <div className="lg:col-span-4">
              <Link href="/" className="flex items-center gap-3" aria-label={`${org.name} — home`}>
                <Image src={org.logo} alt="" width={44} height={44} className="h-11 w-11 shrink-0 grayscale-0" />
                <span className="font-sans text-[16px] font-semibold">
                  {org.fullName}
                </span>
              </Link>
              {/* Tagline close to logo — same thought */}
              <p className="mt-3 font-display text-sm font-semibold text-mint">{org.tagline}</p>
              {/* Description slightly more separated — it's longer supporting copy */}
              <p className="mt-4 max-w-[42ch] text-sm leading-6 text-ink-muted">{footer.description}</p>

              {/* Contact details — generous gap from description */}
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-start gap-2.5 text-ink-muted">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-mint" />
                  <span>{org.headquarters}</span>
                </li>
                <li>
                  <a
                    href={`mailto:${org.email}`}
                    className="flex items-center gap-2.5 break-all text-ink-muted transition-colors hover:text-ink"
                  >
                    <Mail size={15} className="shrink-0 text-mint" />
                    {org.email}
                  </a>
                </li>
              </ul>

              {/* Social links — separated from contact rows */}
              <SocialSelector
                className="mt-6"
                platforms={socials.map((social) => ({
                  key: social.key,
                  name: social.label,
                  url: social.href,
                  domain: new URL(social.href).hostname,
                  handle: social.handle,
                }))}
              />

              {/* Contact block — give it distinct vertical breathing room */}
              <div className="mt-8 rounded-panel border border-line bg-bg p-5">
                <p className="font-display text-[15px] font-semibold tracking-[-0.02em]">
                  {footer.contactBlock.title}
                </p>
                {/* Body tight to heading — they belong together */}
                <p className="mt-1.5 text-sm text-ink-muted">{footer.contactBlock.body}</p>
                {/* CTA with generous top margin — it's an action */}
                <div className="mt-4">
                  <ClayButton href={footer.contactBlock.cta.href} variant="secondary" size="sm">
                    {footer.contactBlock.cta.label}
                  </ClayButton>
                </div>
              </div>
            </div>

            {/* Nav columns */}
            <div className="grid gap-8 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4 lg:gap-6">
              {footer.columns.map((column) => (
                <nav key={column.title} aria-label={column.title}>
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    {column.title}
                  </h2>
                  <ul className="mt-4 space-y-2.5">
                    {column.links.map((link) => {
                      const external = link.href.startsWith('mailto:')
                      return (
                        <li key={link.label}>
                          <Link
                            href={link.href}
                            className="group inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
                          >
                            {link.label}
                            {external ? (
                              <ArrowUpRight
                                size={13}
                                className="opacity-0 transition-opacity group-hover:opacity-100"
                              />
                            ) : null}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              ))}
            </div>
          </div>

          {/* ── Legal bar ──────────────────────────────────────────── */}
          <div className="border-t border-line px-6 py-6 sm:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <p className="text-[13px] text-ink-muted">{footer.copyright}</p>
                <p className="text-[13px] text-ink-muted">{footer.credit}</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  )
}
