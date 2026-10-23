'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Calendar, ArrowUpRight, X, ExternalLink, Tag, Megaphone } from 'lucide-react'
import type { ManagedContentItem } from '@/lib/site-content'
import { safeContentUrl } from '@/lib/utils'

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null
  try {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(dateStr))
  } catch {
    return null
  }
}

function bodyParagraphs(body?: string | null) {
  return (body ?? '')
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

export default function AnnouncementRows({ items }: { items: ManagedContentItem[] }) {
  const [activeItem, setActiveItem] = useState<ManagedContentItem | null>(null)
  const reduceMotion = useReducedMotion()
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const openPopup = useCallback((item: ManagedContentItem) => {
    setActiveItem(item)
  }, [])

  const closePopup = useCallback(() => {
    setActiveItem(null)
  }, [])

  // Lock body scroll, trap focus inside the dialog, and restore focus on close.
  useEffect(() => {
    if (!activeItem) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the dialog so keyboard users land inside it.
    closeRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closePopup()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [activeItem, closePopup])

  const paragraphs = activeItem ? bodyParagraphs(activeItem.body) : []
  const safeAction = activeItem ? safeContentUrl(activeItem.action_url) : null
  const isExternal = safeAction?.startsWith('https://') ?? false

  return (
    <>
      <ul className="announcement-row-list">
        {items.map((item, idx) => {
          const date = formatDate(item.created_at)
          return (
            <motion.li
              key={item.id}
              className="announcement-row"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.35, ease: 'easeOut' }}
              onClick={() => openPopup(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openPopup(item)
                }
              }}
            >
              <div className="announcement-row__indicator" aria-hidden="true">
                <span className="announcement-row__dot" />
              </div>

              <div className="announcement-row__content">
                <div className="announcement-row__main">
                  <h3 className="announcement-row__title">{item.title}</h3>
                  <p className="announcement-row__summary">{item.summary}</p>
                </div>

                <div className="announcement-row__meta">
                  {item.category && (
                    <span className="announcement-row__category">
                      <Tag size={11} />
                      {item.category}
                    </span>
                  )}
                  {date && (
                    <span className="announcement-row__date">
                      <Calendar size={11} />
                      {date}
                    </span>
                  )}
                </div>
              </div>

              <div className="announcement-row__arrow" aria-hidden="true">
                <ArrowUpRight size={16} />
              </div>
            </motion.li>
          )
        })}
      </ul>

      {/* ── Popup Modal ── */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            className="announcement-popup-overlay"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={closePopup}
          >
            <motion.article
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="announcement-popup-title"
              className="announcement-popup"
              initial={reduceMotion ? false : { opacity: 0, y: 48, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32, scale: 0.98 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky chrome — stays pinned while long content scrolls */}
              <header className="announcement-popup__header">
                <span className="announcement-popup__flag" aria-hidden="true">
                  <Megaphone size={18} />
                </span>
                <div className="announcement-popup__heading">
                  <p className="announcement-popup__kicker">Announcement</p>
                  {formatDate(activeItem.created_at) && (
                    <p className="announcement-popup__stamp">
                      <Calendar size={12} />
                      {formatDate(activeItem.created_at)}
                    </p>
                  )}
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  className="announcement-popup__close"
                  onClick={closePopup}
                  aria-label="Close announcement"
                >
                  <X size={18} />
                </button>
              </header>

              <div className="announcement-popup__content">
                <h2 id="announcement-popup-title" className="announcement-popup__title">
                  {activeItem.title}
                </h2>

                {activeItem.image_url ? (
                  <div className="announcement-popup__media">
                    <img
                      src={activeItem.image_url}
                      alt={activeItem.title}
                      className="announcement-popup__image"
                      loading="lazy"
                    />
                  </div>
                ) : null}

                {activeItem.category && (
                  <span className="announcement-popup__chip">
                    <Tag size={12} />
                    {activeItem.category}
                  </span>
                )}

                {activeItem.summary && (
                  <p className="announcement-popup__summary">{activeItem.summary}</p>
                )}

                {paragraphs.map((paragraph, index) => (
                  <p key={index} className="announcement-popup__body-text">
                    {paragraph}
                  </p>
                ))}
              </div>

              {(safeAction || activeItem.price !== null) && (
                <footer className="announcement-popup__footer">
                  {activeItem.price !== null && (
                    <span className="announcement-popup__price">
                      {[activeItem.currency, activeItem.price.toFixed(2)].filter(Boolean).join(' ')}
                    </span>
                  )}
                  {safeAction && (
                    <a
                      href={safeAction}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noopener noreferrer' : undefined}
                      className="clay clay--primary clay--sm announcement-popup__cta"
                    >
                      View details
                      {isExternal ? <ExternalLink size={15} /> : <ArrowUpRight size={15} />}
                    </a>
                  )}
                </footer>
              )}
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
