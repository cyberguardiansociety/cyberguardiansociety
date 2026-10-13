'use client'

import { useState } from 'react'
import { runDangerZoneAction } from '@/app/admin/settings-actions'

export default function TypedDangerAction({
  title,
  description,
  action,
  phrase,
  button,
}: {
  title: string
  description: string
  action: string
  phrase: string
  button: string
}) {
  const [confirmation, setConfirmation] = useState('')
  const verified = confirmation === phrase

  return (
    <form action={runDangerZoneAction} className="settings-danger-action">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <input type="hidden" name="action" value={action} />
      <label>
        Type <code>{phrase}</code> to confirm
        <input
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          required
          spellCheck={false}
          aria-invalid={confirmation.length > 0 && !verified}
        />
      </label>
      <button className="admin-danger-button" type="submit" disabled={!verified}>{button}</button>
    </form>
  )
}
