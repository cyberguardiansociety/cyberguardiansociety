'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { org } from '@/data/site'
import type { LegalSection } from '@/data/legal'

type LegalTocProps = {
  sections: LegalSection[]
}

/**
 * Table of contents with scroll-spy highlighting.
 * On desktop it's sticky in the left rail; on mobile it's a collapsed disclosure.
 */
export default function LegalToc({ sections }: LegalTocProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || '')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // Set up IntersectionObserver for scroll-spy
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-96px 0px -65% 0px',
        threshold: 0,
      }
    )

    sections.forEach((section) => {
      const element = document.getElementById(section.id)
      if (element) {
        observer.observe(element)
      }
    })

    observerRef.current = observer

    // Handle hash changes
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash) {
        setActiveId(hash)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange() // Check on mount

    return () => {
      observer.disconnect()
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [sections])

  const handleClick = (id: string) => {
    setActiveId(id)
  }

  return (
    <>
      {/* Desktop sticky TOC */}
      <nav
        aria-label="On this page"
        className="hidden lg:block lg:sticky lg:top-[calc(64px+32px)] lg:max-h-[calc(100vh-64px-64px)] lg:overflow-y-auto"
      >
        <h2 className="mb-4 text-[0.8125rem] font-semibold text-ink-muted">
          On this page
        </h2>
        <ul className="space-y-0.5">
          {sections.map((section, index) => {
            const isActive = section.id === activeId
            return (
              <li key={section.id}>
                <Link
                  href={`#${section.id}`}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => handleClick(section.id)}
                  className={`
                    block border-l-[2px] py-1.5 pl-3 pr-2 text-[0.875rem]/[1.4] transition-colors duration-150
                    ${isActive
                      ? 'border-l-mint font-medium text-ink'
                      : 'border-l-line text-ink-muted hover:text-ink'
                    }
                  `}
                >
                  {index + 1}. {section.title}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="mt-6 border-t border-line pt-4 text-[13px] text-ink-muted">
          Questions about this document?{' '}
          <a
            href={`mailto:${org.email}`}
            className="font-medium text-mint transition-colors hover:underline"
          >
            Email the team
          </a>
        </div>
      </nav>

      {/* Mobile collapsible TOC */}
      <details className="mb-6 lg:hidden">
        <summary className="cursor-pointer text-[0.8125rem] font-semibold text-ink-muted outline-none">
          On this page
        </summary>
        <ul className="mt-3 space-y-1 pl-2">
          {sections.map((section, index) => (
            <li key={section.id}>
              <Link
                href={`#${section.id}`}
                onClick={() => handleClick(section.id)}
                className="block py-1.5 text-[0.875rem]/[1.4] text-ink-muted transition-colors hover:text-ink"
              >
                {index + 1}. {section.title}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </>
  )
}
