import type { LegalDocument } from '@/data/legal'
import { org } from '@/data/site'
import Container from '@/components/ui/Container'

/**
 * Layout shared by Privacy Policy, Terms of Service and Code of Conduct:
 * a calm header, a sticky table of contents, and readable long-form copy.
 */
export default function LegalPage({ doc }: { doc: LegalDocument }) {
  return (
    <main id="main" className="section--tight pb-20 pt-12 sm:pt-16">
      <Container>
        <header className="max-w-3xl border-b border-line pb-10">
          <p className="eyebrow">Legal information</p>
          <h1 className="mt-4 font-heading text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[44px]">
            {doc.title}
          </h1>
          <ul className="mt-4 space-y-2 text-ink-muted">
            {doc.summary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
            <span>Last updated {doc.updated.label}</span>
            <span aria-hidden="true">·</span>
            <span>Applies to {doc.appliesTo}</span>
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <nav aria-label="On this page" className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                On this page
              </h2>
              <ol className="mt-4 space-y-2.5">
                {doc.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block text-sm text-ink-muted transition-colors hover:text-ink"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
              <p className="mt-6 border-t border-line pt-5 text-[13px] leading-5 text-ink-muted">
                Questions about this document?{' '}
                <a href={`mailto:${org.email}`} className="font-semibold text-mint hover:underline">
                  Email the team
                </a>
                .
              </p>
            </div>
          </nav>

          <article className="prose-legal lg:col-span-9">
            {doc.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2>{section.title}</h2>
                {section.blocks.map((block, blockIndex) =>
                  block.type === 'p' ? (
                    <p key={`${section.id}-block-${blockIndex}`}>{block.text}</p>
                  ) : (
                    <ul key={`${section.id}-block-${blockIndex}`}>
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ),
                )}
              </section>
            ))}
          </article>
        </div>
      </Container>
    </main>
  )
}
