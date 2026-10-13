'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

export type BasicAccordionItem = {
  id: number | string
  title: string
  content: string
}

type BasicAccordionProps = {
  items: readonly BasicAccordionItem[]
  allowMultiple?: boolean
  defaultExpandedIds?: readonly (number | string)[]
  className?: string
}

export default function BasicAccordion({
  items,
  allowMultiple = false,
  defaultExpandedIds = [],
  className = '',
}: BasicAccordionProps) {
  const accordionId = useId()
  const reduceMotion = useReducedMotion()
  const [expandedIds, setExpandedIds] = useState<Set<number | string>>(
    () => new Set(defaultExpandedIds),
  )

  const toggleItem = (id: number | string) => {
    setExpandedIds((current) => {
      if (current.has(id)) {
        const next = new Set(current)
        next.delete(id)
        return next
      }

      return allowMultiple ? new Set([...current, id]) : new Set([id])
    })
  }

  return (
    <ul className={`min-w-0 overflow-hidden rounded-panel border border-line bg-surface shadow-soft ${className}`}>
      {items.map((item, index) => {
        const expanded = expandedIds.has(item.id)
        const triggerId = `${accordionId}-trigger-${index}`
        const panelId = `${accordionId}-panel-${index}`

        return (
          <li key={item.id} className="min-w-0 border-b border-line last:border-b-0">
            <button
              id={triggerId}
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => toggleItem(item.id)}
              className="flex min-h-18 w-full min-w-0 items-start justify-between gap-4 px-5 py-5 text-left text-base font-semibold text-ink transition-colors hover:text-mint focus-visible:relative focus-visible:z-10 motion-reduce:transition-none sm:gap-5 sm:px-7 sm:py-6"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-mint bg-mint text-xs font-semibold text-on-mint" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1 wrap-anywhere">{item.title}</span>
              <ChevronDown
                aria-hidden="true"
                size={18}
                className={`mt-1 shrink-0 text-mint transition-transform duration-300 motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            <motion.div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              aria-hidden={!expanded}
              inert={!expanded}
              initial={false}
              animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { height: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.2 } }
              }
              className="min-w-0 overflow-hidden"
            >
              <p className="min-w-0 pb-6 pl-17 pr-5 text-sm leading-6 text-ink-muted wrap-anywhere sm:pb-7 sm:pl-21 sm:pr-7">
                {item.content}
              </p>
            </motion.div>
          </li>
        )
      })}
    </ul>
  )
}
