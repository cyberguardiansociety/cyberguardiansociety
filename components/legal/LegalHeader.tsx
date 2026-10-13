import type { LegalDocument } from '@/data/legal'

type LegalHeaderProps = {
  doc: LegalDocument
}

/**
 * Header with h1, description, metadata (last updated/applies to), and a hairline divider.
 */
export default function LegalHeader({ doc }: LegalHeaderProps) {
  return (
    <>
      <h1 className="font-heading text-[clamp(2rem,1.4rem+2.4vw,3rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
        {doc.title}
      </h1>
      <p className="mt-4 max-w-[60ch] text-[1.125rem]/[1.6] text-ink-muted">
        {doc.description}
      </p>

      <dl className="mt-7 flex flex-col gap-6 sm:flex-row sm:gap-6">
        <div>
          <dt className="text-[0.8125rem] text-ink-muted">Last updated</dt>
          <dd className="mt-1 text-[0.9375rem] text-ink">
            <time dateTime={doc.updated.iso}>{doc.updated.label}</time>
          </dd>
        </div>
        <div>
          <dt className="text-[0.8125rem] text-ink-muted">Applies to</dt>
          <dd className="mt-1 text-[0.9375rem] text-ink">{doc.appliesTo}</dd>
        </div>
      </dl>

      <div className="mt-8 h-px border-t border-line" />
    </>
  )
}
