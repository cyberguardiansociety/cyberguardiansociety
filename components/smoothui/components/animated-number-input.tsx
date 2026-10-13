'use client'

import { cn } from '@/lib/utils'
import SmoothButton from '@/components/smoothui/components/smooth-button'
import { Minus, Plus } from 'lucide-react'
import { AnimatePresence, motion, useAnimation, useReducedMotion } from 'motion/react'
import {
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

const DEFAULT_STEP = 1
const DEFAULT_MIN = Number.NEGATIVE_INFINITY
const DEFAULT_MAX = Number.POSITIVE_INFINITY
const LARGE_STEP_MULTIPLIER = 10
const SMALL_STEP_DIVISOR = 10
const SCRUB_THRESHOLD_PX = 4
const SCRUB_STEP_PX = 8
const ROLL_DISTANCE = 14
const SHAKE_DISTANCE = 6
const SHAKE_DURATION = 0.4
const DIGIT_SPRING = { bounce: 0.1, duration: 0.25, type: 'spring' as const }
const MOVEMENT_EASE = [0.645, 0.045, 0.355, 1] as const
const NON_NUMERIC_CHARS_REGEX = /[^\d.-]/g

export type AnimatedNumberInputProps = {
  allowEmpty?: boolean
  className?: string
  clampOnBlur?: boolean
  defaultValue?: number | null
  disabled?: boolean
  format?: Intl.NumberFormatOptions
  label?: string
  max?: number
  min?: number
  onValueChange?: (value: number | null) => void
  precision?: number
  prefix?: string
  scrub?: boolean
  step?: number
  stepper?: boolean
  suffix?: string
  value?: number | null
}

const clampValue = (num: number, min: number, max: number) =>
  Math.min(max, Math.max(min, num))

const isDigitChar = (char: string) => /\d/.test(char)

const parseRawValue = (text: string, prefix?: string, suffix?: string): number | null => {
  let cleaned = text.trim()
  if (prefix && cleaned.startsWith(prefix)) cleaned = cleaned.slice(prefix.length)
  if (suffix && cleaned.endsWith(suffix)) cleaned = cleaned.slice(0, -suffix.length)
  cleaned = cleaned.replace(NON_NUMERIC_CHARS_REGEX, '')
  if (cleaned === '' || cleaned === '-') return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

type DigitSlotProps = {
  char: string
  direction: 1 | -1
  reduceMotion: boolean
}

function DigitSlot({ char, direction, reduceMotion }: DigitSlotProps) {
  const rolling = isDigitChar(char)

  return (
    <span className="relative inline-block h-[1.2em] w-[0.62em] overflow-hidden text-center align-bottom tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={char}
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: rolling ? direction * ROLL_DISTANCE : 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: rolling ? -direction * ROLL_DISTANCE : 0 }}
          transition={reduceMotion ? { duration: 0 } : DIGIT_SPRING}
          className="absolute inset-0 flex items-center justify-center"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

type FadeBlockProps = { className?: string; reduceMotion: boolean; text: string }

function FadeBlock({ text, reduceMotion, className }: FadeBlockProps) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        key={text}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
        transition={reduceMotion ? { duration: 0 } : DIGIT_SPRING}
        className={cn('inline-block', className)}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  )
}

export default function AnimatedNumberInput({
  value: controlledValue,
  defaultValue = 0,
  onValueChange,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  step = DEFAULT_STEP,
  precision,
  format,
  prefix = '',
  suffix = '',
  scrub = true,
  stepper = false,
  clampOnBlur = true,
  allowEmpty = false,
  disabled = false,
  label,
  className,
}: AnimatedNumberInputProps) {
  const reduceMotion = Boolean(useReducedMotion())
  const reactId = useId()
  const inputId = `animated-number-input-${reactId.replace(/:/g, '')}`
  const [internalValue, setInternalValue] = useState<number | null>(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue
  const lastValueRef = useRef(value ?? 0)
  const [isEditing, setIsEditing] = useState(false)
  const [rawInputValue, setRawInputValue] = useState('')
  const [direction, setDirection] = useState<1 | -1>(1)
  const [isInvalid, setIsInvalid] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const shakeControls = useAnimation()
  const scrubRef = useRef<{ active: boolean; startValue: number; startX: number } | null>(null)

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(undefined, {
      maximumFractionDigits: precision,
      minimumFractionDigits: precision,
      ...format,
    }),
    [precision, format],
  )
  const formattedText = useMemo(
    () => (value === null ? '' : numberFormatter.format(value)),
    [numberFormatter, value],
  )

  useEffect(() => {
    if (value !== null) lastValueRef.current = value
  }, [value])

  useEffect(() => {
    if (!isInvalid) return
    if (reduceMotion) {
      setIsInvalid(false)
      return
    }
    let cancelled = false
    shakeControls
      .start({
        transition: { duration: SHAKE_DURATION, ease: MOVEMENT_EASE },
        x: [0, -SHAKE_DISTANCE, SHAKE_DISTANCE, -SHAKE_DISTANCE / 2, 0],
      })
      .then(() => {
        if (!cancelled) setIsInvalid(false)
      })
    return () => {
      cancelled = true
    }
  }, [isInvalid, reduceMotion, shakeControls])

  const applyValue = useCallback(
    (next: number, options?: { clamp?: boolean }) => {
      const shouldClamp = options?.clamp ?? true
      let nextValue = shouldClamp ? clampValue(next, min, max) : next
      if (precision !== undefined) {
        const factor = 10 ** precision
        nextValue = Math.round(nextValue * factor) / factor
      }
      setDirection(nextValue >= lastValueRef.current ? 1 : -1)
      lastValueRef.current = nextValue
      if (!isControlled) setInternalValue(nextValue)
      onValueChange?.(nextValue)
      setIsEditing(false)
      setIsInvalid(false)
    },
    [isControlled, min, max, precision, onValueChange],
  )

  const applyEmpty = useCallback(() => {
    if (!isControlled) setInternalValue(null)
    onValueChange?.(null)
    setIsEditing(false)
    setIsInvalid(false)
    setRawInputValue('')
  }, [isControlled, onValueChange])

  const commitFromText = useCallback(() => {
    const parsed = parseRawValue(rawInputValue, prefix, suffix)
    if (parsed === null) {
      if (allowEmpty && rawInputValue.trim() === '') {
        applyEmpty()
        return
      }
      setIsInvalid(true)
      setIsEditing(false)
      setRawInputValue(formattedText)
      return
    }
    applyValue(parsed, { clamp: clampOnBlur })
  }, [rawInputValue, prefix, suffix, formattedText, clampOnBlur, allowEmpty, applyEmpty, applyValue])

  const handleFocus = () => {
    setIsEditing(true)
    setRawInputValue(formattedText)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIsEditing(true)
    setRawInputValue(event.target.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    const bigStep = step * LARGE_STEP_MULTIPLIER
    const smallStep = step / SMALL_STEP_DIVISOR
    const effectiveStep = event.shiftKey ? bigStep : event.altKey ? smallStep : step
    const currentValue = lastValueRef.current

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        applyValue(currentValue + effectiveStep)
        break
      case 'ArrowDown':
        event.preventDefault()
        applyValue(currentValue - effectiveStep)
        break
      case 'PageUp':
        event.preventDefault()
        applyValue(currentValue + bigStep)
        break
      case 'PageDown':
        event.preventDefault()
        applyValue(currentValue - bigStep)
        break
      case 'Home':
        if (Number.isFinite(min)) {
          event.preventDefault()
          applyValue(min)
        }
        break
      case 'End':
        if (Number.isFinite(max)) {
          event.preventDefault()
          applyValue(max)
        }
        break
      case 'Enter':
        event.preventDefault()
        commitFromText()
        break
      default:
        break
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLInputElement>) => {
    if (!scrub || disabled) return
    scrubRef.current = { active: false, startValue: lastValueRef.current, startX: event.clientX }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLInputElement>) => {
    if (!(scrub && scrubRef.current) || disabled) return
    const state = scrubRef.current
    const deltaX = event.clientX - state.startX
    if (!state.active) {
      if (Math.abs(deltaX) < SCRUB_THRESHOLD_PX) return
      state.active = true
      setIsScrubbing(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    const steps = Math.trunc(deltaX / SCRUB_STEP_PX)
    applyValue(state.startValue + steps * step)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLInputElement>) => {
    if (scrubRef.current?.active) {
      event.currentTarget.releasePointerCapture(event.pointerId)
      setIsScrubbing(false)
    }
    scrubRef.current = null
  }

  const handleStep = (delta: number) => () => {
    if (!disabled) applyValue(lastValueRef.current + delta)
  }

  const currentText = isEditing ? rawInputValue : formattedText

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label ? (
        <label className="text-sm font-medium text-ink-muted" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <motion.div
        animate={shakeControls}
        className={cn(
          'relative flex h-13.5 items-center overflow-hidden rounded-2xl border border-line bg-surface-2 focus-within:ring-2 focus-within:ring-mint focus-within:ring-offset-2 focus-within:ring-offset-bg',
          isInvalid && 'border-error',
          disabled && 'cursor-not-allowed opacity-50',
          scrub && !disabled && !isScrubbing && 'cursor-ew-resize',
          isScrubbing && 'cursor-ew-resize',
        )}
      >
        <div aria-hidden="true" className="pointer-events-none flex flex-1 select-none items-center px-3 text-sm font-medium text-ink">
          {prefix ? <FadeBlock className="mr-0.5" reduceMotion={reduceMotion} text={prefix} /> : null}
          {currentText.split('').map((char, index) => (
            <DigitSlot
              key={index}
              char={char}
              direction={direction}
              reduceMotion={reduceMotion}
            />
          ))}
          {suffix ? <FadeBlock className="ml-0.5" reduceMotion={reduceMotion} text={suffix} /> : null}
        </div>
        <input
          id={inputId}
          type="text"
          role="spinbutton"
          inputMode="decimal"
          aria-label={label ?? 'Number input'}
          aria-invalid={isInvalid}
          aria-valuemin={Number.isFinite(min) ? min : undefined}
          aria-valuemax={Number.isFinite(max) ? max : undefined}
          aria-valuenow={value ?? undefined}
          aria-valuetext={value === null ? undefined : formattedText}
          value={currentText}
          disabled={disabled}
          onBlur={commitFromText}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 h-full w-full rounded-none border-0 bg-transparent p-0 text-transparent shadow-none outline-none focus:translate-y-0 focus:scale-100 focus:shadow-none hover:translate-y-0 hover:scale-100 hover:shadow-none"
          style={{ caretColor: 'var(--ink)' }}
        />
        {stepper ? (
          <div className="relative z-10 mr-1 flex items-center gap-0.5">
            <SmoothButton
              type="button"
              aria-label="Decrease value"
              disabled={disabled || (value !== null && value <= min)}
              onClick={handleStep(-step)}
              size="icon-sm"
              variant="ghost"
            >
              <Minus />
            </SmoothButton>
            <SmoothButton
              type="button"
              aria-label="Increase value"
              disabled={disabled || (value !== null && value >= max)}
              onClick={handleStep(step)}
              size="icon-sm"
              variant="ghost"
            >
              <Plus />
            </SmoothButton>
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}
