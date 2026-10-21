'use client'

import { useState, useTransition, useRef } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import HighSecurityDeleteModal from '@/components/admin/HighSecurityDeleteModal'

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
  confirmationPhrase?: string
  itemName?: string
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
  confirmationPhrase = 'DELETE',
  itemName,
}: AdminDeleteButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    setModalOpen(false)
    if (formRef.current) {
      const formData = new FormData(formRef.current)
      formData.set('confirmation', confirmationPhrase)
      startTransition(async () => {
        await action(formData)
      })
    }
  }

  const renderButtonContent = () => (
    <>
      {isPending ? <Loader2 size={13} className="admin-spin-icon animate-spin" /> : <Trash2 size={13} />}
      {variant !== 'icon' && <span>{isPending ? 'Deleting…' : label}</span>}
    </>
  )

  const buttonClass =
    variant === 'icon'
      ? `admin-card-top-delete-btn ${className}`
      : variant === 'compact'
      ? `admin-danger-button admin-modern-button admin-modern-button--compact ${className}`
      : `admin-danger-button admin-modern-button ${className}`

  return (
    <>
      <form
        ref={formRef}
        action={action}
        onClick={(e) => e.stopPropagation()}
        className="admin-inline-delete-form"
      >
        <input type="hidden" name={name} value={value} />
        <input type="hidden" name="confirmation" value={confirmationPhrase} />
        {Object.entries(extraFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button
          type="button"
          disabled={isPending}
          title={title}
          aria-label={title}
          onClick={handleTriggerClick}
          className={buttonClass}
        >
          {renderButtonContent()}
        </button>
      </form>

      <HighSecurityDeleteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={title}
        itemName={itemName || `${name}: ${value}`}
        description={confirmMessage}
        confirmationPhrase={confirmationPhrase}
        isPending={isPending}
      />
    </>
  )
}
