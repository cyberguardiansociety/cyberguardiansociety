import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import ClayButton from '@/components/ui/ClayButton'
import Container from '@/components/ui/Container'

export default function NotFound() {
  return (
    <main id="main" className="section--tight">
      <Container>
        <section className="relative overflow-hidden rounded-panel border border-line bg-surface px-6 py-16 shadow-panel sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 border-l border-line lg:block" />
          <div className="relative max-w-2xl">
            <p className="eyebrow">404 / Route unavailable</p>
            <p className="mt-5 font-mono text-7xl font-semibold leading-none text-mint sm:text-8xl">404</p>
            <h1 className="mt-5 font-heading text-3xl font-semibold sm:text-4xl">
              This page isn&apos;t in our network.
            </h1>
            <p className="mt-4 max-w-[48ch] text-ink-muted">
              The address may be outdated, or the page may have moved. Head back to the home page or contact our team for help.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ClayButton href="/" icon={<ArrowLeft size={15} />}>
                Back home
              </ClayButton>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold transition-colors hover:border-mint hover:text-mint"
              >
                Contact support <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </Container>
    </main>
  )
}