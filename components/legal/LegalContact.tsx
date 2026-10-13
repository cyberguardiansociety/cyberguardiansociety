import { org } from '@/data/site'
import ClayButton from '@/components/ui/ClayButton'

/**
 * End-of-document contact strip that replaces the promo banner on legal pages.
 */
export default function LegalContact() {
  return (
    <div className="mt-12 rounded-[16px] border border-line bg-surface p-6 pb-7 pt-[24px] sm:mt-14">
      <h2 className="font-display text-[18px] font-semibold text-ink">
        Questions about this document?
      </h2>
      <p className="mt-2 text-[15px] text-ink-muted">
        Our independent student-led team reads every message and replies as soon as we can.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <ClayButton href="/contact" variant="secondary">
          Contact us
        </ClayButton>
        <a
          href={`mailto:${org.email}`}
          className="text-[15px] text-mint transition-colors hover:underline"
        >
          Email the team
        </a>
      </div>
    </div>
  )
}
