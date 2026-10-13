import type { LegalDocument } from '@/data/legal'

type LegalSummaryProps = {
  summary: LegalDocument['summary']
}

/**
 * "In short" card with three bullet points and a caption.
 * Renders nothing if summary is empty.
 */
export default function LegalSummary({ summary }: LegalSummaryProps) {
  if (!summary || summary.length === 0) {
    return null
  }

  return (
    <div className="relative overflow-hidden rounded-[12px] border border-line bg-surface p-6 pb-7 pl-[26px] pt-[24px] before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-mint">
      <h2 className="mb-4 text-[15px] font-semibold text-ink">In short</h2>
      <ul className="mb-3 space-y-2 text-[0.9375rem] text-ink-muted">
        {summary.map((point, index) => (
          <li key={index} className="flex gap-2.5">
            <span className="mt-[5px] h-[5px] w-[5px] shrink-0 rounded-full bg-mint" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-ink-muted">
        A short summary. The full text below is what applies.
      </p>
    </div>
  )
}
