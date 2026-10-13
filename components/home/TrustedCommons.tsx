import Image from 'next/image'
import { Network, Shield, Users } from 'lucide-react'
import { trustedCommons } from '@/data/site'
import Container from '@/components/ui/Container'

const icons = [Users, Shield, Network]

export default function TrustedCommons() {
  return (
    <section className="section" aria-labelledby="commons-heading">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Image — slightly more separation between image and text column */}
          <div className="relative lg:col-span-5">
            <div className="overflow-hidden rounded-panel border border-line">
              <Image
                src={trustedCommons.image}
                alt="Defenders collaborating"
                width={800}
                height={900}
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <p className="absolute bottom-4 left-4 right-4 rounded-full border border-line bg-surface px-4 py-2.5 text-center text-xs font-medium text-ink sm:text-sm">
              {trustedCommons.badge}
            </p>
          </div>

          <div className="lg:col-span-7">
            {/* Eyebrow tight to headline — they are the same thought */}
            <p className="eyebrow">{trustedCommons.eyebrow}</p>
            <h2
              id="commons-heading"
              className="mt-3 max-w-[18ch] font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl"
            >
              {trustedCommons.headline}
            </h2>
            {/* Body pulled a bit further from headline — it's supporting detail, not a subtitle */}
            <p className="mt-5 max-w-[50ch] text-ink-muted">{trustedCommons.body}</p>

            {/* Feature list — generous separation from the intro paragraph */}
            <ul className="mt-10 space-y-6">
              {trustedCommons.points.map((point, i) => {
                const Icon = icons[i] ?? Shield
                return (
                  <li key={point.title} className="flex gap-4">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint text-on-mint">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <div>
                      {/* Title and body are tight — they belong together as one idea */}
                      <h3 className="font-display text-[17px] font-semibold tracking-[-0.02em]">
                        {point.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">{point.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  )
}
