import type { ReactNode } from 'react'

/** 1200px max-width page container with 8px-based gutters. */
export default function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`wrap ${className}`.trim()}>{children}</div>
}
