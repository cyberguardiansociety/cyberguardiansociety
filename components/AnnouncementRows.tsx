'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Calendar, ArrowUpRight, X, ExternalLink, Tag } from 'lucide-react'
import type { ManagedContentItem } from '@/lib/site-content'
import { safeContentUrl } from '@/lib/utils'

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null
  try {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(dateStr))
  } catch {
    return null
  }
}

export default function AnnouncementRows({ items }: { items: ManagedContentItem[] }) {
  const [activeItem, setActiveItem] = useState<ManagedContentItem | null>(null)
  const reduceMotion = useReducedMotion()

  const openPopup = useCallback((item: ManagedContentItem) => {
    setActiveItem(item)
    document.body.style.overflow = 'hidden'
  }, [])

  const closePopup = useCallback(() => {
    setActiveItem(null)
    document.body.style.overflow = ''
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopup()
    }
    if (activeItem) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeItem, closePopup])

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={closePopup}
            aria-modal="true"
            role="dialog"
            aria-label={activeItem.title}
          >
            <motion.article
              className="announcement-popup"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: 'spring', bounce: 0.18, duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="announcement-popup__close"
                onClick={closePopup}
                aria-label="Close announcement"
              >
                <X size={18} />
              </button>

              {activeItem.image_url ? (
                <div className="announcement-popup__hero">
                  <img
                    src={activeItem.image_url}
                    alt=""
                    className="announcement-popup__image"
                    loading="lazy"
                  />
                  <div className="announcement-popup__hero-fade" />
                </div>
              ) : (
                <div className="announcement-popup__hero announcement-popup__hero--empty">
                  <div className="announcement-popup__hero-label">
                    {activeItem.category || 'CGS'}
                  </div>
                </div>
              )}

              <div className="announcement-popup__body">
                <div className="announcement-popup__tags">
                  {activeItem.category && (
                    <span className="announcement-popup__tag">
                      <Tag size={12} />
                      {activeItem.category}
                    </span>
                  )}
                  {formatDate(activeItem.created_at) && (
                    <span className="announcement-popup__tag announcement-popup__tag--date">
                      <Calendar size={12} />
                      {formatDate(activeItem.created_at)}
                    </span>
                  )}
                </div>

                <h2 className="announcement-popup__title">{activeItem.title}</h2>
                <p className="announcement-popup__summary">{activeItem.summary}</p>

                {activeItem.price !== null && (
                  <p className="announcement-popup__price">
                    {activeItem.currency} {activeItem.price.toFixed(2)}
                  </p>
                )}

                {(() => {
                  const safeAction = safeContentUrl(activeItem.action_url)
                  if (!safeAction) return null
                  const isExternal = safeAction.startsWith('https://')
                  return (
                    <a
                      href={safeAction}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noopener noreferrer' : undefined}
                      className="announcement-popup__cta"
                    >
                      <ExternalLink size={14} />
                      View details
                    </a>
                  )
                })()}
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
