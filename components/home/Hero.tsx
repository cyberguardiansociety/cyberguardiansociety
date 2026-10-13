import { hero } from '@/data/site'
import ClayButton from '@/components/ui/ClayButton'
import Container from '@/components/ui/Container'

export default function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="hero-world-map py-24 sm:py-32 lg:py-40">
      <div className="relative z-10">
        <Container>
          <div className="rise mx-auto max-w-4xl text-center">
            <p className="eyebrow">{hero.eyebrow}</p>
            <h1
              id="hero-heading"
              className="mx-auto mt-4 max-w-[18ch] font-heading text-[42px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[56px] lg:text-[72px]"
            >
              {hero.headline}
            </h1>
            <p className="mx-auto mt-6 max-w-[46ch] text-[16px] leading-6.5 text-ink-muted sm:text-[17px] sm:leading-7">
              {hero.sub}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <ClayButton href={hero.primaryCta.href}>{hero.primaryCta.label}</ClayButton>
              <ClayButton href={hero.secondaryCta.href} variant="secondary">
                {hero.secondaryCta.label}
              </ClayButton>
            </div>
          </div>
        </Container>
      </div>
    </section>
  )
}
