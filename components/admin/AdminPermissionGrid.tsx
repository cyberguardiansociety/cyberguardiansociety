'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Check, ShieldCheck, Lock } from 'lucide-react'

type PermissionItem = {
  key: string
  label: string
  description?: string
}

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

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="admin-permissions-grid">
      {groups.map((group) => (
        <fieldset className="admin-permission-group admin-modern-permission-group" key={group.label}>
          <legend>{group.label}</legend>
          <div className="admin-permission-options">
            {group.items.map(([key, label]) => {
              const isChecked = selected.has(key)
              return (
                <motion.label
                  key={key}
                  className={`admin-cyber-checkbox-card ${isChecked ? 'admin-cyber-checkbox-card--active' : ''}`}
                  whileHover={reduceMotion ? undefined : { scale: 1.015, y: -1 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.22 }}
                  onClick={() => toggle(key)}
                >
                  {/* Real input for form action */}
                  <input
                    type="checkbox"
                    name="permission"
                    value={key}
                    checked={isChecked}
                    onChange={() => {}} // Handled by card click
                    className="sr-only"
                    tabIndex={-1}
                  />

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
                </motion.label>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
