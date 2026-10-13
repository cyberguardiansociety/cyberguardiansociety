'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

export type AnimatedToggleProps = {
  checked?: boolean
  className?: string
  defaultChecked?: boolean
  disabled?: boolean
  icons?: { on: ReactNode; off: ReactNode }
  label?: string
  onChange?: (checked: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'morph' | 'icon'
}

const SPRING = { bounce: 0.1, duration: 0.25, type: 'spring' as const }

const SIZES = {
  lg: { icon: 'size-3.5', thumb: 'size-6', thumbTranslate: 24, track: 'h-7 w-[52px]' },
  md: { icon: 'size-3', thumb: 'size-5', thumbTranslate: 20, track: 'h-6 w-11' },
  sm: { icon: 'size-2.5', thumb: 'size-4', thumbTranslate: 16, track: 'h-5 w-9' },
}

export default function AnimatedToggle({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  variant = 'default',
  icons,
  size = 'md',
  disabled = false,
  label,
  className,
}: AnimatedToggleProps) {
  const reduceMotion = useReducedMotion()
  const [internalChecked, setInternalChecked] = useState(defaultChecked)
  const isControlled = controlledChecked !== undefined
  const checked = isControlled ? controlledChecked : internalChecked
  const sizeConfig = SIZES[size]
  const thumbBorderRadius = variant === 'morph' && !reduceMotion && !checked ? 6 : 9999
  const thumbTranslate = checked ? sizeConfig.thumbTranslate : 0

  const handleToggle = useCallback(() => {
    if (disabled) return
    const next = !checked
    if (!isControlled) setInternalChecked(next)
    onChange?.(next)
  }, [checked, disabled, isControlled, onChange])

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        checked ? 'bg-mint' : 'bg-ink',
        disabled && 'cursor-not-allowed opacity-50',
        sizeConfig.track,
        className,
      )}
    >
      <motion.span
        initial={false}
        animate={
          reduceMotion
            ? { x: thumbTranslate }
            : { borderRadius: thumbBorderRadius, x: thumbTranslate }
        }
        style={{ borderRadius: thumbBorderRadius }}
        transition={reduceMotion ? { duration: 0 } : SPRING}
        className={cn(
          'pointer-events-none flex items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-soft',
          sizeConfig.thumb,
        )}
      >
        {variant === 'icon' && icons ? (
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={checked ? 'on' : 'off'}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.5 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, rotate: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: -90, scale: 0.5 }}
              transition={reduceMotion ? { duration: 0 } : SPRING}
              className={cn('flex items-center justify-center', sizeConfig.icon)}
            >
              {checked ? icons.on : icons.off}
            </motion.span>
          </AnimatePresence>
        ) : null}
      </motion.span>
    </button>
  )
}
