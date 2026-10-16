'use client'

import { useState, useRef, useEffect } from 'react'
import { Trash2, AlertTriangle, X } from 'lucide-react'
import AdminFormSubmitButton from './AdminFormSubmitButton'

type Props = {
  userId: string
  adminEmail: string
  action: (formData: FormData) => Promise<void> | void | Promise<any>
}

export default function AdminDeleteAccountButton({ userId, adminEmail, action }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setConfirmOpen(false)
      }
    }
    if (confirmOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [confirmOpen])

  return (
    <div className="admin-delete-account-wrap" ref={containerRef} style={{ position: 'relative' }}>
      {!confirmOpen ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="admin-danger-button admin-modern-button-small"
          title={`Delete administrator account for ${adminEmail}`}
        >
          <Trash2 size={13} />
          <span>Delete</span>
        </button>
      ) : (
        <div
          className="admin-delete-confirm-popover"
          style={{
            position: 'absolute',
            right: 0,
            bottom: '100%',
            marginBottom: '8px',
            width: '260px',
            background: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(239, 68, 68, 0.15)',
            borderRadius: '12px',
            padding: '12px',
            zIndex: 50,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={16} style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '12px', color: '#ffffff', lineHeight: 1.3 }}>
                Delete administrator?
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                Permanently revoke access for <strong style={{ color: '#fca5a5' }}>{adminEmail}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '2px',
                display: 'grid',
                placeItems: 'center',
              }}
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>

          <form action={action}>
            <input type="hidden" name="userId" value={userId} />
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="admin-secondary-button admin-modern-button-small"
                style={{ flex: 1, padding: '5px 8px', fontSize: '11px' }}
              >
                Cancel
              </button>
              <AdminFormSubmitButton
                pendingLabel="Deleting…"
                className="admin-danger-button admin-modern-button-small"
                style={{ flex: 1, padding: '5px 8px', fontSize: '11px' }}
              >
                Confirm delete
              </AdminFormSubmitButton>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
