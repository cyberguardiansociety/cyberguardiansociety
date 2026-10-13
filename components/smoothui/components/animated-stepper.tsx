'use client'

import { cn } from '@/lib/utils'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type KeyboardEvent, type ReactNode, useCallback, useId, useState } from 'react'

export type StepItem = {
  content?: ReactNode
  description?: string
  icon?: ReactNode
  label: string
}

export type AnimatedStepperProps = {
  allowClickNavigation?: boolean
  className?: string
  currentStep?: number
  defaultStep?: number
  onStepChange?: (step: number) => void
  steps: StepItem[]
  variant?: 'horizontal' | 'vertical'
}

const SPRING = { bounce: 0.1, duration: 0.25, type: 'spring' as const }
const SPRING_BOUNCY = { bounce: 0.2, duration: 0.3, type: 'spring' as const }

function CheckIcon({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <motion.path
        d="M5 13l4 4L19 7"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={reduceMotion ? { duration: 0 } : SPRING}
      />
    </motion.svg>
  )
}

export default function AnimatedStepper({
  steps,
  currentStep: controlledStep,
  defaultStep = 0,
  onStepChange,
  variant = 'horizontal',
  allowClickNavigation = false,
  className,
}: AnimatedStepperProps) {
  const reduceMotion = Boolean(useReducedMotion())
  const id = useId()
  const [internalStep, setInternalStep] = useState(defaultStep)
  const [direction, setDirection] = useState(1)
  const isControlled = controlledStep !== undefined
  const requestedStep = isControlled ? controlledStep : internalStep
  const activeStep = steps.length > 0 ? Math.max(0, Math.min(steps.length - 1, requestedStep)) : 0
  const isHorizontal = variant === 'horizontal'

  const handleStepChange = useCallback((nextStep: number) => {
    if (nextStep < 0 || nextStep >= steps.length) return
    setDirection(nextStep > activeStep ? 1 : -1)
    if (!isControlled) setInternalStep(nextStep)
    onStepChange?.(nextStep)
  }, [isControlled, onStepChange, activeStep, steps.length])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    if (!allowClickNavigation) return
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
    const previousKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'
    if (event.key === nextKey) {
      event.preventDefault()
      handleStepChange(Math.min(activeStep + 1, steps.length - 1))
    } else if (event.key === previousKey) {
      event.preventDefault()
      handleStepChange(Math.max(activeStep - 1, 0))
    }
  }, [allowClickNavigation, isHorizontal, activeStep, steps.length, handleStepChange])

  const progress = steps.length > 1 ? activeStep / (steps.length - 1) : 0
  const activeContent = steps[activeStep]?.content

  return (
    <div className={cn('flex w-full gap-6', isHorizontal ? 'flex-col' : 'flex-row', className)}>
      <div
        aria-label="Progress steps"
        aria-orientation={isHorizontal ? 'horizontal' : 'vertical'}
        className={cn('relative flex', isHorizontal ? 'flex-row items-center justify-between' : 'flex-col items-start gap-2')}
        role="tablist"
      >
        {steps.map((step, index) => {
          const isActive = index === activeStep
          const isCompleted = index < activeStep
          const panelId = `${id}-tabpanel-${index}`

          return (
            <div key={`${id}-step-${step.label}`} className={cn('relative z-10 flex items-center', isHorizontal ? 'flex-1' : 'gap-3')}>
              <motion.button
                id={`${id}-step-${index}`}
                type="button"
                role="tab"
                aria-label={`Step ${index + 1}: ${step.label}${isCompleted ? ', completed' : ''}${isActive ? ', current' : ''}`}
                aria-selected={isActive}
                aria-controls={step.content ? panelId : undefined}
                tabIndex={isActive ? 0 : -1}
                disabled={!allowClickNavigation}
                onClick={() => allowClickNavigation && handleStepChange(index)}
                onKeyDown={handleKeyDown}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                transition={reduceMotion ? { duration: 0 } : { ...SPRING_BOUNCY, delay: index * 0.05 }}
                whileTap={allowClickNavigation && !reduceMotion ? { scale: 0.9 } : undefined}
                className={cn(
                  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium shadow-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                  isActive && 'border-mint bg-mint text-on-mint',
                  isCompleted && 'border-mint bg-mint text-on-mint',
                  !(isActive || isCompleted) && 'border-line bg-surface text-ink-muted',
                  allowClickNavigation ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                {isActive && !reduceMotion ? (
                  <motion.span
                    aria-hidden="true"
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.6 }}
                    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute inset-0 rounded-full border-2 border-mint"
                  />
                ) : null}
                <AnimatePresence initial={false} mode="wait">
                  {isCompleted ? (
                    <motion.span
                      key="check"
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                      transition={reduceMotion ? { duration: 0 } : SPRING_BOUNCY}
                    >
                      <CheckIcon reduceMotion={reduceMotion} />
                    </motion.span>
                  ) : step.icon ? (
                    <motion.span
                      key="icon"
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                      transition={reduceMotion ? { duration: 0 } : SPRING}
                    >
                      {step.icon}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="number"
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                      transition={reduceMotion ? { duration: 0 } : SPRING}
                    >
                      {index + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <div className={cn(isHorizontal ? 'ml-2 hidden sm:block' : '')}>
                <p className={cn('text-sm font-medium transition-colors duration-200', isActive ? 'text-ink' : 'text-ink-muted')}>
                  {step.label}
                </p>
                {step.description ? <p className="text-xs text-ink-muted">{step.description}</p> : null}
              </div>

              {isHorizontal && index < steps.length - 1 ? (
                <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                  <motion.div
                    animate={{ width: index < activeStep ? '100%' : '0%' }}
                    transition={reduceMotion ? { duration: 0 } : SPRING}
                    className="h-full bg-mint"
                  />
                </div>
              ) : null}
            </div>
          )
        })}

        {!isHorizontal ? (
          <div className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-0.5 -translate-x-1/2 overflow-hidden bg-line">
            <motion.div
              animate={{ height: `${progress * 100}%` }}
              transition={reduceMotion ? { duration: 0 } : SPRING}
              className="w-full bg-mint"
            />
          </div>
        ) : null}
      </div>

      {activeContent !== undefined ? (
        <div id={`${id}-tabpanel-${activeStep}`} aria-label={`Step ${activeStep + 1} content`} aria-labelledby={`${id}-step-${activeStep}`} role="tabpanel">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={activeStep}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 20 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: -direction * 20 }}
              transition={reduceMotion ? { duration: 0 } : SPRING}
            >
              {activeContent}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  )
}
