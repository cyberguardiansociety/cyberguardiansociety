import Link from 'next/link'
import type { LegalDocument } from '@/data/legal'

type LegalSlug = 'privacy' | 'code-of-conduct' | 'terms'

type LegalSwitcherProps = {
  current: LegalSlug
}

const documents: { slug: LegalSlug; label: string; href: string }[] = [
  { slug: 'privacy', label: 'Privacy Policy', href: '/privacy' },
  { slug: 'code-of-conduct', label: 'Code of Conduct', href: '/code-of-conduct' },
  { slug: 'terms', label: 'Terms of Service', href: '/terms' },
]

/**
 * Segmented control for switching between legal documents.
 * The current page is shown as a raised clay pill; inactive segments are flat links.
 */
export default function LegalSwitcher({ current }: LegalSwitcherProps) {
  return (
    <nav aria-label="Legal documents" className="mb-8 overflow-x-auto">
      <div className="inline-flex gap-1">
        {documents.map((doc) => {
          const isActive = doc.slug === current
          return (
            <Link
              key={doc.slug}
              href={doc.href}
              aria-current={isActive ? 'page' : undefined}
              className={`
                min-h-[44px] px-4 py-2 text-sm font-medium transition-colors duration-150
                ${isActive
                  ? 'rounded-full bg-surface-2 font-semibold text-ink shadow-none'
                  : 'rounded-full text-ink-muted hover:text-ink'
                }
              `}
            >
              {doc.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
