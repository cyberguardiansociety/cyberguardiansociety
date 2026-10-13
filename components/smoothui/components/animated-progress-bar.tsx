'use client'

import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

const MIN_PROGRESS_VALUE = 0
const MAX_PROGRESS_VALUE = 100
const SPRING = {
  damping: 10,
  duration: 0.25,
  mass: 0.75,
  stiffness: 100,
  type: 'spring' as const,
}

export type AnimatedProgressBarProps = {
  ariaLabel?: string
  barClassName?: string
  className?: string
  color?: string
  label?: string
  labelClassName?: string
  trackClassName?: string
  value: number
}

export default function AnimatedProgressBar({
  value,
  label,
  ariaLabel,
  color = 'var(--mint)',
  className,
  barClassName,
  labelClassName,
  trackClassName,
}: AnimatedProgressBarProps) {
  const reduceMotion = useReducedMotion()
  const progress = Math.max(MIN_PROGRESS_VALUE, Math.min(MAX_PROGRESS_VALUE, value))

  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <div className={cn('mb-1 text-sm font-medium text-ink-muted', labelClassName)}>
          {label}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-label={ariaLabel ?? label ?? 'Progress'}
        aria-valuenow={progress}
        aria-valuemin={MIN_PROGRESS_VALUE}
        aria-valuemax={MAX_PROGRESS_VALUE}
        className={cn(
          'relative h-3 w-full overflow-hidden rounded-full border border-line bg-line',
          trackClassName,
        )}
      >
        <motion.div
          initial={reduceMotion ? false : { width: `${MIN_PROGRESS_VALUE}%` }}
          animate={{ width: `${progress}%` }}
          className={cn('h-full rounded-full', barClassName)}
          style={{ backgroundColor: color }}
          transition={reduceMotion ? { duration: 0 } : SPRING}
        />
      </div>
    </div>
  )
}
