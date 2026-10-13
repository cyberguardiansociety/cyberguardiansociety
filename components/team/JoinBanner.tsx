import { teamPage } from '@/data/site'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function JoinBanner() {
  const t = teamPage.cta

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-line/50 bg-gradient-to-br from-mint to-mint-dim p-8 sm:p-12">
          {/* Decorative blurred circle */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold text-on-mint sm:text-4xl">
              {t.heading}
            </h2>
            <p className="mt-4 text-base text-on-mint/90 sm:text-lg">
              {t.sub}
            </p>
            <div className="mt-8">
              <Link
                href={t.primaryCta.href}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-surface px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                {t.primaryCta.label}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
