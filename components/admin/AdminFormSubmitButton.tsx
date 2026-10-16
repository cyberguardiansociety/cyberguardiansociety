'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

type Props = ComponentProps<'button'> & {
  pendingLabel?: string
  icon?: ReactNode
}

export default function AdminFormSubmitButton({
  children,
  pendingLabel = 'Processing…',
  icon,
  className = 'admin-primary-button admin-modern-button',
  disabled,
  ...rest
}: Props) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className}
      data-pending={pending ? 'true' : undefined}
      {...rest}
    >
      {pending ? (
        <>
          <Loader2 size={16} className="spin-animation" aria-hidden="true" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{children}</span>
        </>
      )}
    </button>
  )
}
