import type { ReactNode } from 'react'

/**
 * Legal pages use the shared root site chrome; the footer banner hides itself on these routes.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return children
}
