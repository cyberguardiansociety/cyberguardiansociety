import type { LegalDocument } from '@/data/legal'
import LegalLayout from './LegalLayout'
import LegalSwitcher from './LegalSwitcher'
import LegalHeader from './LegalHeader'
import LegalSummary from './LegalSummary'
import LegalToc from './LegalToc'
import LegalSection from './LegalSection'
import LegalContact from './LegalContact'

type LegalDocumentProps = {
  doc: LegalDocument
}

/**
 * Main template for legal pages. Combines all shared components:
 * - Layout wrapper
 * - Document switcher
 * - Header with metadata
 * - Two-column layout (contents rail + document)
 * - Summary card
 * - Sections
 * - Contact strip
 */
export default function LegalDocument({ doc }: LegalDocumentProps) {
  return (
    <LegalLayout>
      <div className="print:hidden">
        <LegalSwitcher current={doc.slug as 'privacy' | 'code-of-conduct' | 'terms'} />
      </div>
      <LegalHeader doc={doc} />

      <div className="mt-12 grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16 print:grid-cols-1 print:gap-0">
        {/* Left rail: contents list */}
        <aside className="hidden lg:block print:hidden">
          <LegalToc sections={doc.sections} />
        </aside>

        {/* Right column: document */}
        <div className="min-w-0">
          {/* Mobile TOC */}
          <div className="mb-8 lg:hidden print:hidden">
            <LegalToc sections={doc.sections} />
          </div>

          {/* Summary card */}
          {doc.summary && doc.summary.length > 0 && (
            <div className="mb-14 print:hidden">
              <LegalSummary summary={doc.summary} />
            </div>
          )}

          {/* Sections */}
          <div className="space-y-12 sm:space-y-14 print:space-y-6">
            {doc.sections.map((section, index) => (
              <LegalSection key={section.id} section={section} index={index} />
            ))}
          </div>

          {/* Contact strip */}
          <div className="print:hidden">
            <LegalContact />
          </div>
        </div>
      </div>
    </LegalLayout>
  )
}
