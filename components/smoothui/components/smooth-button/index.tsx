'use client'

import { Slot } from '@radix-ui/react-slot'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const smoothButtonVariants = cva(
  'relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium outline-none ring-offset-bg transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    defaultVariants: {
      shape: 'default',
      size: 'default',
      variant: 'solid',
    },
    variants: {
      color: {
        accent: '[--btn-fg:var(--on-mint)] [--btn-hover:var(--mint-dim)] [--btn:var(--mint)]',
        amber: '[--btn-fg:var(--on-mint)] [--btn-hover:var(--mint-dim)] [--btn:var(--mint)]',
        blue: '[--btn-fg:var(--on-mint)] [--btn-hover:var(--mint-dim)] [--btn:var(--mint)]',
        destructive: '[--btn-fg:var(--on-mint)] [--btn-hover:var(--error)] [--btn:var(--error)]',
        green: '[--btn-fg:var(--on-mint)] [--btn-hover:var(--mint-dim)] [--btn:var(--mint)]',
        neutral: '[--btn-fg:var(--bg)] [--btn-hover:var(--ink-muted)] [--btn:var(--ink)]',
      },
      shape: {
        default: '',
        pill: 'rounded-full!',
        square: 'rounded-none!',
      },
      size: {
        default: 'h-10 gap-2 rounded-lg px-4 py-2 text-sm [&_svg]:size-4',
        icon: 'size-10 rounded-lg [&_svg]:size-4',
        'icon-lg': 'size-11 rounded-lg [&_svg]:size-5',
        'icon-sm': 'size-9 rounded-md [&_svg]:size-4',
        lg: 'h-11 gap-2 rounded-lg px-8 text-base [&_svg]:size-5',
        sm: 'h-9 gap-1.5 rounded-md px-3 text-sm [&_svg]:size-4',
        xs: 'h-7 gap-1.5 rounded-sm px-2.5 text-xs [&_svg]:size-3.5',
      },
      variant: {
        candy: 'border border-line bg-[var(--btn,var(--mint))] text-[var(--btn-fg,var(--on-mint))] shadow-none ring-1 ring-line hover:bg-[var(--btn-hover,var(--mint-dim))]',
        default: 'bg-mint text-on-mint shadow-soft hover:bg-mint-dim',
        destructive: 'bg-error text-on-mint shadow-soft',
        ghost: 'text-[var(--btn,var(--ink))] hover:bg-surface-2',
        link: 'text-[var(--btn,var(--mint))] underline-offset-4 hover:underline',
        outline: 'border border-line bg-bg text-[var(--btn,var(--ink))] shadow-soft hover:bg-surface-2',
        secondary: 'bg-surface-2 text-ink shadow-soft hover:bg-line',
        soft: 'bg-surface-2 text-[var(--btn,var(--ink))] hover:bg-line',
        solid: 'bg-[var(--btn,var(--mint))] text-[var(--btn-fg,var(--on-mint))] shadow-soft hover:bg-[var(--btn-hover,var(--mint-dim))]',
      },
    },
  },
)

export type SmoothButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'prefix' | 'color'
> &
  VariantProps<typeof smoothButtonVariants> & {
    asChild?: boolean
    loading?: boolean
    prefix?: ReactNode
    suffix?: ReactNode
    forcePress?: boolean
    ref?: Ref<HTMLButtonElement>
  }

const Spinner = () => (
  <svg aria-hidden="true" className="size-[1em] animate-spin motion-reduce:animate-none" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-90" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
  </svg>
)

export default function SmoothButton({
  className,
  variant,
  color,
  size,
  shape,
  asChild = false,
  loading = false,
  forcePress = false,
  prefix,
  suffix,
  disabled,
  children,
  ref,
  ...props
}: SmoothButtonProps) {
  const reduceMotion = useReducedMotion()
  const localRef = useRef<HTMLButtonElement>(null)
  const classes = cn(smoothButtonVariants({ className, color, shape, size, variant }))

  useEffect(() => {
    const node = localRef.current
    if (!(forcePress && node) || reduceMotion) return

    const forceThreshold = 2
    const onForce = (event: Event) => {
      const force = (event as Event & { webkitForce?: number }).webkitForce ?? 0
      node.style.transform = force >= forceThreshold ? 'scale(0.94)' : ''
    }
    const reset = () => {
      node.style.transform = ''
    }

    node.addEventListener('webkitmouseforcechanged', onForce)
    node.addEventListener('mouseup', reset)
    node.addEventListener('mouseleave', reset)
    return () => {
      node.removeEventListener('webkitmouseforcechanged', onForce)
      node.removeEventListener('mouseup', reset)
      node.removeEventListener('mouseleave', reset)
    }
  }, [forcePress, reduceMotion])

  if (asChild) {
    return (
      <Slot className={classes} ref={ref} {...props}>
        {children}
      </Slot>
    )
  }

  const setRefs = (node: HTMLButtonElement | null) => {
    localRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as { current: HTMLButtonElement | null }).current = node
  }

  return (
    <button
      aria-busy={loading || undefined}
      className={classes}
      disabled={disabled || loading}
      ref={setRefs}
      type={props.type ?? 'button'}
      {...props}
    >
      <AnimatePresence initial={false}>
        {loading ? (
          <motion.span
            key="spinner"
            initial={reduceMotion ? { marginRight: '0.5rem', opacity: 1, width: '1em' } : { marginRight: 0, opacity: 0, width: 0 }}
            animate={{ marginRight: '0.5rem', opacity: 1, width: '1em' }}
            exit={{ marginRight: 0, opacity: 0, width: 0 }}
            transition={reduceMotion ? { duration: 0 } : { bounce: 0.1, duration: 0.25, type: 'spring' }}
            className="inline-flex shrink-0 items-center justify-center overflow-hidden"
          >
            <Spinner />
          </motion.span>
        ) : null}
      </AnimatePresence>
      {prefix}
      {children}
      {suffix}
    </button>
  )
}

export { smoothButtonVariants }
