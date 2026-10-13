import { finalCta } from '@/data/site'
import ClayButton from '@/components/ui/ClayButton'
import Container from '@/components/ui/Container'

export default function FinalCta() {
  return (
    <section className="section--tight pb-20" aria-labelledby="final-cta-heading">
      <Container>
        <div className="mint-cta on-mint flex flex-col gap-10 px-8 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-12 sm:py-14">
          {/* Text block — heading and sub are close to each other, generous gap before buttons */}
          <div className="max-w-xl">
            <h2
              id="final-cta-heading"
              className="font-heading text-3xl font-semibold tracking-[-0.03em] text-mint-on sm:text-4xl"
            >
              {finalCta.heading}
            </h2>
            {/* Sub sits close to heading — they belong together */}
            <p className="mt-3 text-sm leading-6 text-mint-on sm:text-base">{finalCta.sub}</p>
          </div>
          {/* Buttons grouped tightly — they are a single decision */}
          <div className="flex shrink-0 flex-wrap gap-3">
            <ClayButton href={finalCta.primaryCta.href} variant="brass">
              {finalCta.primaryCta.label}
            </ClayButton>
            <ClayButton href={finalCta.secondaryCta.href} variant="neutral">
              {finalCta.secondaryCta.label}
            </ClayButton>
          </div>
        </div>
      </Container>
    </section>
  )
}
