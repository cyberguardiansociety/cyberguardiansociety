'use client'

import { useRef, useState } from 'react'
import { motion, useAnimationFrame, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

export const AI_LOADER_CYCLE_SECONDS = 1.2

const DOT_COUNT = 3
const GRID_CELLS = 9
const GRID_DELAYS = [0, 1, 2, 1, 2, 3, 2, 3, 4]
const EASE_IN_OUT = [0.645, 0.045, 0.355, 1] as const

export type AILoaderVariant = 'dots' | 'bar' | 'grid'

export type AILoaderProps = {
  className?: string
  label?: string
  showElapsed?: boolean
  variant?: AILoaderVariant
}

function Dots({ reduced }: { reduced: boolean }) {
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: DOT_COUNT }, (_, index) => (
        <motion.span
          key={index}
          animate={reduced ? { opacity: 0.5 } : { opacity: [0.25, 1, 0.25] }}
          className="size-1.5 rounded-full bg-current"
          transition={
            reduced
              ? { duration: 0 }
              : {
                  delay: (index * AI_LOADER_CYCLE_SECONDS) / (DOT_COUNT * 2),
                  duration: AI_LOADER_CYCLE_SECONDS,
                  ease: EASE_IN_OUT,
                  repeat: Number.POSITIVE_INFINITY,
                }
          }
        />
      ))}
    </span>
  )
}

function Bar({ reduced }: { reduced: boolean }) {
  return (
    <span className="relative block h-1 w-24 overflow-hidden rounded-full bg-current/15">
      <motion.span
        animate={reduced ? { x: '0%' } : { x: ['-100%', '200%'] }}
        className="absolute inset-y-0 w-1/3 rounded-full bg-current"
        transition={
          reduced
            ? { duration: 0 }
            : {
                duration: AI_LOADER_CYCLE_SECONDS * 1.4,
                ease: EASE_IN_OUT,
                repeat: Number.POSITIVE_INFINITY,
              }
        }
      />
    </span>
  )
}

function Grid({ reduced }: { reduced: boolean }) {
  return (
    <span className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: GRID_CELLS }, (_, index) => (
        <motion.span
          key={index}
          animate={reduced ? { opacity: 0.45 } : { opacity: [0.2, 1, 0.2] }}
          className="size-1.5 rounded-xs bg-current"
          transition={
            reduced
              ? { duration: 0 }
              : {
                  delay: ((GRID_DELAYS[index] ?? 0) * AI_LOADER_CYCLE_SECONDS) / 8,
                  duration: AI_LOADER_CYCLE_SECONDS,
                  ease: EASE_IN_OUT,
                  repeat: Number.POSITIVE_INFINITY,
                }
          }
        />
      ))}
    </span>
  )
}

function Elapsed() {
  const startRef = useRef<number | null>(null)
  const [seconds, setSeconds] = useState(0)

  useAnimationFrame((time) => {
    const start = startRef.current ?? time
    startRef.current = start
    const next = (time - start) / 1000

    setSeconds((current) =>
      next.toFixed(1) === current.toFixed(1) ? current : next,
    )
  })

  return <span className="tabular-nums opacity-60">{seconds.toFixed(1)}s</span>
}

export default function AILoader({
  className,
  label,
  showElapsed = false,
  variant = 'dots',
}: AILoaderProps) {
  const reduced = Boolean(useReducedMotion())

  return (
    <span
      aria-live="polite"
      className={cn('inline-flex items-center gap-2 text-muted-foreground text-sm', className)}
      role="status"
    >
      {label ? <span>{label}</span> : null}
      {variant === 'dots' ? <Dots reduced={reduced} /> : null}
      {variant === 'bar' ? <Bar reduced={reduced} /> : null}
      {variant === 'grid' ? <Grid reduced={reduced} /> : null}
      {showElapsed ? <Elapsed /> : null}
      <span className="sr-only">{label ?? 'Loading'}</span>
    </span>
  )
}
