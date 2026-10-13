import Link from 'next/link'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import AILoader from '@/components/smoothui/components/ai-loader'

type Variant = 'primary' | 'secondary' | 'neutral' | 'brass'
type Size = 'md' | 'sm'

type CommonProps = {
  /** Fill and shadow recipe. `brass` is reserved for one action on the page. */
  variant?: Variant
  /** 48px (default) or 40px. Icon-only variants are 44px / 40px. */
  size?: Size
  /** Swaps the label for a spinner without changing the button width. */
  loading?: boolean
  className?: string
}

type IconOnly = {
  iconOnly: true
  'aria-label': string
  children: ReactNode
  icon?: never
}

type WithLabel = {
  iconOnly?: false
  children: ReactNode
  /** Optional leading icon. Decorative: hidden from assistive tech. */
  icon?: ReactNode
  'aria-label'?: string
}

type ButtonProps = CommonProps &
  (IconOnly | WithLabel) &
  Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'className'> & { href?: undefined }

type AnchorProps = CommonProps &
  (IconOnly | WithLabel) &
  Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'children' | 'className'> & { href: string }

export type ClayButtonProps = ButtonProps | AnchorProps

/**
 * The one button in the system. Clay recipe lives in app/globals.css so the
 * layered shadows, press squish and focus ring stay identical everywhere.
 */
export default function ClayButton(props: ClayButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconOnly = false,
    icon,
    className,
    children,
    ...rest
  } = props as CommonProps &
    WithLabel & { href?: string; [key: string]: unknown }

  const classes = [
    'clay',
    `clay--${variant}`,
    size === 'sm' ? 'clay--sm' : '',
    iconOnly ? 'clay--icon' : '',
    'font-sans',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      {iconOnly ? (
        <span className="clay__icon grid place-items-center" aria-hidden="true">
          {children}
        </span>
      ) : (
        <>
          {icon ? (
            <span className="clay__icon shrink-0" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <span className="clay__label">{children}</span>
        </>
      )}
      {loading ? (
        <span className="clay__spinner">
          <AILoader variant="dots" className="text-[var(--clay-ink)]" />
        </span>
      ) : null}
    </>
  )

  const { href, ...attrs } = rest

  if (typeof href === 'string') {
    return (
      <Link
        href={href}
        className={classes}
        data-loading={loading ? 'true' : undefined}
        aria-busy={loading || undefined}
        {...(attrs as Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'children' | 'className'>)}
      >
        {inner}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={classes}
      data-loading={loading ? 'true' : undefined}
      aria-busy={loading || undefined}
      {...(attrs as Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'className'>)}
    >
      {inner}
    </button>
  )
}
