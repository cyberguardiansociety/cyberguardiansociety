'use client'

import { Check, Copy, LoaderCircle } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

type CopyState = 'idle' | 'loading' | 'success' | 'error'

export type ButtonCopyProps = {
  className?: string
  disabled?: boolean
  duration?: number
  label?: string
  idleIcon?: ReactNode
  loadingDuration?: number
  loadingIcon?: ReactNode
  onCopy?: () => Promise<void> | void
  successIcon?: ReactNode
}

const defaultIcons = {
  idle: <Copy size={16} />,
  loading: <LoaderCircle className="animate-spin motion-reduce:animate-none" size={16} />,
  success: <Check size={16} />,
}

export default function ButtonCopy({
  onCopy,
  idleIcon = defaultIcons.idle,
  loadingIcon = defaultIcons.loading,
  successIcon = defaultIcons.success,
  className = '',
  duration = 2000,
  loadingDuration = 1000,
  disabled = false,
  label = 'text',
}: ButtonCopyProps) {
  const [buttonState, setButtonState] = useState<CopyState>('idle')
  const reduceMotion = useReducedMotion()
  const requestId = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(
    () => () => {
      requestId.current += 1
      timers.current.forEach(clearTimeout)
    },
    [],
  )

  const handleClick = useCallback(async () => {
    const request = ++requestId.current
    timers.current.forEach(clearTimeout)
    timers.current = []
    setButtonState('loading')

    try {
      await onCopy?.()
    } catch {
      if (request === requestId.current) setButtonState('error')
      return
    }

    if (request !== requestId.current) return

    timers.current = [
      setTimeout(() => {
        if (request === requestId.current) setButtonState('success')
      }, loadingDuration),
      setTimeout(() => {
        if (request === requestId.current) setButtonState('idle')
      }, loadingDuration + duration),
    ]
  }, [duration, loadingDuration, onCopy])

  const icons: Record<CopyState, ReactNode> = {
    error: idleIcon,
    idle: idleIcon,
    loading: loadingIcon,
    success: successIcon,
  }
  const ariaLabels: Record<CopyState, string> = {
    error: `Copy failed. Try again to copy ${label}`,
    idle: `Copy ${label}`,
    loading: `Copying ${label}`,
    success: `${label} copied`,
  }

  return (
    <button
      type="button"
      aria-label={ariaLabels[buttonState]}
      aria-live="polite"
      aria-busy={buttonState === 'loading'}
      disabled={disabled || buttonState === 'loading' || buttonState === 'success'}
      onClick={handleClick}
      className={`relative grid h-11 w-11 min-h-11 min-w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface text-ink-muted transition-colors hover:text-mint focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 disabled:opacity-50 motion-reduce:transition-none ${className}`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={buttonState}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(8px)', y: -10 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, filter: 'blur(0px)', y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(8px)', y: 10 }}
          transition={reduceMotion ? { duration: 0 } : { bounce: 0, duration: 0.25, type: 'spring' }}
          className="flex items-center justify-center"
        >
          {icons[buttonState]}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
