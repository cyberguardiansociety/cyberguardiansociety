'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Lock, ShieldAlert, Trash2, Unlock, X, Loader2 } from 'lucide-react'

type HighSecurityDeleteModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  itemName?: string
  description?: string
  confirmationPhrase?: string
  isPending?: boolean
}

export default function HighSecurityDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  description,
  confirmationPhrase = 'DELETE',
  isPending = false,
}: HighSecurityDeleteModalProps) {
  const [typedValue, setTypedValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isMatched = typedValue.trim() === confirmationPhrase.trim()

  useEffect(() => {
    if (isOpen) {
      setTypedValue('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isPending) {
      onClose()
    } else if (e.key === 'Enter' && isMatched && !isPending) {
      e.preventDefault()
      void onConfirm()
    }
  }

  return (
    <div className="security-modal-backdrop" onClick={() => !isPending && onClose()}>
      <div
        className="security-modal-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-modal-title"
      >
        {/* Top security banner */}
        <div className="security-modal-banner">
          <div className="security-modal-shield">
            <ShieldAlert size={24} className="text-red-500 animate-pulse" />
          </div>
          <div className="security-modal-headings">
            <span className="security-modal-kicker">Security Protocol · Destructive Action</span>
            <h3 id="security-modal-title">{title}</h3>
          </div>
          <button
            type="button"
            className="security-modal-close-btn"
            onClick={onClose}
            disabled={isPending}
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal body */}
        <div className="security-modal-body">
          {itemName && (
            <div className="security-target-card">
              <span className="security-target-label">Target Record:</span>
              <strong className="security-target-name">{itemName}</strong>
            </div>
          )}

          <p className="security-warning-text">
            {description ||
              'This is a destructive action that permanently purges the data from the database. It cannot be undone or recovered.'}
          </p>

          <div className="security-challenge-container">
            <label htmlFor="security-verification-input" className="security-challenge-prompt">
              To authorize this deletion, please type <code className="security-challenge-token">{confirmationPhrase}</code> below:
            </label>

            <div className={`security-input-wrap ${isMatched ? 'is-valid' : typedValue ? 'is-invalid' : ''}`}>
              <input
                id="security-verification-input"
                ref={inputRef}
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={`Type "${confirmationPhrase}"`}
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                disabled={isPending}
                className="security-text-input"
              />
              <span className="security-match-indicator">
                {isMatched ? (
                  <Unlock size={16} className="text-emerald-400" />
                ) : (
                  <Lock size={16} className="text-zinc-500" />
                )}
              </span>
            </div>

            {typedValue && !isMatched && (
              <span className="security-helper-mismatch">
                Phrase does not match. Please type exactly <code className="text-red-400">{confirmationPhrase}</code>.
              </span>
            )}
            {isMatched && (
              <span className="security-helper-matched">
                ✓ Verification authorized. Ready to execute permanent deletion.
              </span>
            )}
          </div>
        </div>

        {/* Modal footer */}
        <div className="security-modal-footer">
          <button
            type="button"
            className="security-cancel-button"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="security-danger-confirm-button"
            disabled={!isMatched || isPending}
            onClick={() => void onConfirm()}
          >
            {isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Deleting permanently…</span>
              </>
            ) : (
              <>
                <Trash2 size={15} />
                <span>Confirm Permanent Deletion</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
