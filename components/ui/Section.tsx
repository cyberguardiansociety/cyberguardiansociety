import type { ReactNode } from 'react'

type SectionProps = {
  children: ReactNode
  /** Anchor target and accessible name source. */
  id?: string
  /** Slightly tighter rhythm for bands that sit between two full sections. */
  dense?: boolean
  className?: string
}

/**
 * Section shell: applies the clamp(72px, 10vw, 140px) vertical rhythm and
 * keeps a real <section> landmark for every block on the page.
 */
export default function Section({ children, id, dense = false, className = '' }: SectionProps) {
  return (
    <section id={id} className={`${dense ? 'section--tight' : 'section'} ${className}`.trim()}>
      {children}
    </section>
  )
}
