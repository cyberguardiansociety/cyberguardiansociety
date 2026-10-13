import type { ReactNode } from 'react'

type LegalLayoutProps = {
  children: ReactNode
}

/**
 * Layout wrapper for legal pages. Handles the centred wrapper, spacing,
 * and print rules. Accepts children that render the full legal document.
 */
export default function LegalLayout({ children }: LegalLayoutProps) {
  return (
    <main id="main" className="bg-bg min-h-screen pt-[72px] pb-[96px] sm:pt-[72px] hero-world-map">
      <div className="mx-auto max-w-[944px] px-5 sm:px-8 lg:px-10">
        {children}
      </div>
    </main>
  )
}
