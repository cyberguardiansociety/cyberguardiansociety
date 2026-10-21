'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import HighSecurityDeleteModal from './HighSecurityDeleteModal'

type Props = {
  userId: string
  adminEmail: string
  action: (formData: FormData) => Promise<void> | void | Promise<any>
}

export default function AdminDeleteAccountButton({ userId, adminEmail, action }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleConfirm = async () => {
    setIsPending(true)
    try {
      const formData = new FormData()
      formData.set('userId', userId)
      formData.set('confirmation', 'DELETE ACCOUNT')
      await action(formData)
    } finally {
      setIsPending(false)
      setModalOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="admin-danger-button admin-modern-button-small"
        title={`Delete administrator account for ${adminEmail}`}
      >
        <Trash2 size={13} />
        <span>Delete</span>
      </button>

      <HighSecurityDeleteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        title="Revoke Administrator Account"
        itemName={adminEmail}
        description={`You are about to permanently delete the administrator account for ${adminEmail}. This will immediately revoke all dashboard access and permissions.`}
        confirmationPhrase="DELETE ACCOUNT"
        isPending={isPending}
      />
    </>
  )
}
