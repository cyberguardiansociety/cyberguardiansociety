'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ShieldCheck, Sparkles, XCircle } from 'lucide-react'

type PermissionGroup = {
  label: string
  items: readonly (readonly [string, string])[] | readonly [string, string][]
}

type Props = {
  groups: readonly PermissionGroup[]
  defaultPermissions?: string[]
}

export default function AdminPermissionGrid({ groups, defaultPermissions = [] }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultPermissions))
  const reduceMotion = useReducedMotion()

  const allKeys = groups.flatMap((g) => g.items.map(([key]) => key))

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(allKeys))
  }, [allKeys])

  const clearAll = useCallback(() => {
    setSelected(new Set())
  }, [])

  const applyPreset = useCallback((keys: string[]) => {
    setSelected(new Set(keys))
  }, [])

  return (
    <div className="admin-permissions-grid-wrapper">
      {/* ── Toolbar: Counter + Quick Presets + Select/Clear All ── */}
      <div className="admin-permissions-toolbar">
        <div className="admin-permissions-toolbar__status">
          <ShieldCheck size={15} className="admin-permissions-toolbar__icon" />
          <span className="admin-permissions-toolbar__count">
            <strong>{selected.size}</strong> of {allKeys.length} permissions granted
          </span>
        </div>

        <div className="admin-permissions-toolbar__actions">
          <button
            type="button"
            onClick={() => applyPreset(['sessions', 'speakers', 'speaker_applications'])}
            className="admin-perm-preset-btn"
          >
            Sessions &amp; Speakers
          </button>
          <button
            type="button"
            onClick={() => applyPreset(['content_announcement', 'content_product', 'content_resource'])}
            className="admin-perm-preset-btn"
          >
            Content &amp; News
          </button>
          <button
            type="button"
            onClick={selectAll}
            className="admin-perm-quick-btn"
            title="Select all available permissions"
          >
            <Sparkles size={12} /> Select all
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="admin-perm-quick-btn admin-perm-quick-btn--clear"
            title="Clear all selected permissions"
          >
            <XCircle size={12} /> Clear all
          </button>
        </div>
      </div>

      {/* ── Hidden inputs for reliable form submission ── */}
      {Array.from(selected).map((key) => (
        <input key={key} type="hidden" name="permission" value={key} />
      ))}

      {/* ── Permission Groups Grid ── */}
      <div className="admin-permissions-grid">
        {groups.map((group) => (
          <fieldset className="admin-permission-group admin-modern-permission-group" key={group.label}>
            <legend>{group.label}</legend>
            <div className="admin-permission-options">
              {group.items.map(([key, label]) => {
                const isChecked = selected.has(key)
                return (
                  <motion.div
                    key={key}
                    className={`admin-cyber-checkbox-card ${isChecked ? 'admin-cyber-checkbox-card--active' : ''}`}
                    whileHover={reduceMotion ? undefined : { scale: 1.015, y: -1 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.22 }}
                    onClick={() => toggle(key)}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        toggle(key)
                      }
                    }}
                  >
                    {/* Animated Box Indicator */}
                    <div
                      className={`admin-cyber-check-box ${isChecked ? 'admin-cyber-check-box--checked' : ''}`}
                      aria-hidden="true"
                    >
                      <AnimatePresence>
                        {isChecked && (
                          <motion.svg
                            className="admin-cyber-check-icon"
                            viewBox="0 0 16 16"
                            fill="none"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', bounce: 0.35, duration: 0.26 }}
                          >
                            <motion.path
                              d="M3.5 8.5L6.5 11.5L12.5 4.5"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                            />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Label Text */}
                    <div className="admin-cyber-check-text">
                      <strong className="admin-cyber-check-title">{label}</strong>
                      <span className="admin-cyber-check-key">{key}</span>
                    </div>

                    {/* Active Indicator Glow */}
                    {isChecked && (
                      <motion.div
                        className="admin-cyber-card-glow"
                        layoutId={`glow-${key}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      />
                    )}
                  </motion.div>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  )
}

