'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'

type AdminDeleteButtonProps = {
  action: (formData: FormData) => Promise<void> | void
  name: string
  value: string
  label?: string
  confirmMessage?: string
  variant?: 'icon' | 'compact' | 'full'
  className?: string
  title?: string
  extraFields?: Record<string, string>
}

export default function AdminDeleteButton({
  action,
  name,
  value,
  label = 'Delete',
  confirmMessage = 'Are you sure you want to delete this record? This action cannot be undone.',
  variant = 'full',
  className = '',
  title = 'Delete record',
  extraFields = {},
}: AdminDeleteButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.stopPropagation()
    if (!window.confirm(confirmMessage)) {
      e.preventDefault()
      return
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  if (variant === 'icon') {
    return (
      <form action={action} onSubmit={handleSubmit} onClick={handleClick} className="admin-inline-delete-form">
        <input type="hidden" name={name} value={value} />
        {Object.entries(extraFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button
          type="submit"
          disabled={isPending}
          title={title}
          aria-label={title}
          className={`admin-card-top-delete-btn ${className}`}
        >
          {isPending ? <Loader2 size={13} className="admin-spin-icon" /> : <Trash2 size={13} />}
        </button>
      </form>
    )
  }

  if (variant === 'compact') {
    return (
      <form action={action} onSubmit={handleSubmit} onClick={handleClick} className="admin-inline-delete-form">
        <input type="hidden" name={name} value={value} />
        {Object.entries(extraFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button
          type="submit"
          disabled={isPending}
          title={title}
          className={`admin-danger-button admin-modern-button admin-modern-button--compact ${className}`}
        >
          {isPending ? <Loader2 size={13} className="admin-spin-icon" /> : <Trash2 size={13} />}
          <span>{label}</span>
        </button>
      </form>
    )
  }

  return (
    <form action={action} onSubmit={handleSubmit} onClick={handleClick} className="admin-inline-delete-form">
      <input type="hidden" name={name} value={value} />
      {Object.entries(extraFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        disabled={isPending}
        title={title}
        className={`admin-danger-button admin-modern-button ${className}`}
      >
        {isPending ? <Loader2 size={14} className="admin-spin-icon" /> : <Trash2 size={14} />}
        <span>{label}</span>
      </button>
    </form>
  )
}
