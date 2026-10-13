import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  /** Deliberately a scale, not one value: chip 8px, card 16px, panel 28px. */
  radius?: 'chip' | 'card' | 'panel'
  fill?: 'surface' | 'sage' | 'deep' | 'quiet' | 'none'
  elevated?: boolean
  className?: string
}

const radiusClass = {
  chip: 'rounded-chip',
  card: 'rounded-card',
  panel: 'rounded-panel',
} as const

const fillClass = {
  surface: 'bg-surface border border-line',
  sage: 'bg-sage-100 border border-transparent',
  /* Deep pine reads the same in both themes; `on-deep` flips its text. */
  deep: 'on-deep bg-pine-700 border border-transparent',
  quiet: 'bg-surface-2 border border-transparent',
  none: '',
} as const

export default function Card({
  children,
  radius = 'card',
  fill = 'surface',
  elevated = false,
  className = '',
}: CardProps) {
  return (
    <div
      className={[
        radiusClass[radius],
        fillClass[fill],
        elevated ? 'shadow-soft' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
