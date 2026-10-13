import Link from 'next/link'
import { Link2 } from 'lucide-react'
import type { LegalSection, Block } from '@/data/legal'

type LegalSectionProps = {
  section: LegalSection
  index: number
}

/**
 * Renders a single section with h2 and its blocks (paragraphs and lists).
 * On desktop, a link icon appears in the gutter on hover for anchor linking.
 */
export default function LegalSection({ section, index }: LegalSectionProps) {
  return (
    <section
      id={section.id}
      className="scroll-mt-[calc(64px+24px)]"
      aria-labelledby={`${section.id}-heading`}
    >
      <div className="group relative flex items-start gap-3">
        {/* Link icon (desktop only, on hover) */}
        <Link
          href={`#${section.id}`}
          aria-label={`Link to section: ${section.title}`}
          className="hidden lg:mt-1 lg:block lg:text-ink-muted lg:opacity-0 lg:transition-opacity lg:group-hover:lg:opacity-100 lg:group-focus-within:lg:opacity-100"
        >
          <Link2 size={16} strokeWidth={2} />
        </Link>

        <div className="flex-1">
          <h2
            id={`${section.id}-heading`}
            className="font-display text-[1.375rem] font-semibold leading-[1.3] tracking-[-0.01em] text-ink sm:text-[1.25rem]"
          >
            <span className="font-mono text-ink-muted">
              {index + 1}.
            </span>{' '}
            {section.title}
          </h2>

          <div className="mt-[14px] space-y-4">
            {section.blocks.map((block, blockIndex) => (
              <BlockRenderer key={blockIndex} block={block} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function BlockRenderer({ block }: { block: Block }) {
  if (block.type === 'p') {
    return (
      <p className="text-[17px] leading-[1.75] text-ink-muted sm:text-[16px]">
        {block.text}
      </p>
    )
  }

  if (block.type === 'list') {
    return (
      <ul className="ml-5 space-y-[10px] pl-5">
        {block.items.map((item, itemIndex) => (
          <li
            key={itemIndex}
            className="relative text-[17px] leading-[1.75] text-ink-muted sm:text-[16px]"
          >
            <span className="absolute left-[-20px] top-[5px] h-[5px] w-[5px] rounded-full bg-mint" />
            {item}
          </li>
        ))}
      </ul>
    )
  }

  return null
}
