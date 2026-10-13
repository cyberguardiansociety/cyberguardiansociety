'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { Globe, Mail, Users, X } from 'lucide-react'
import { GitHubIcon, InstagramIcon, LinkedInIcon, WhatsAppIcon } from '@/components/ui/SocialIcons'
import type { TeamMember } from '@/data/site'

interface TeamModalProps {
  member: TeamMember
  onClose: () => void
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function TeamModal({ member, onClose }: TeamModalProps) {
  const teamMembers = member.team || []
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Lock body scroll, trap focus inside the dialog, and restore focus on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the dialog so keyboard users land inside it.
    closeRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
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

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      // Return focus to whatever opened the dialog.
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="team-modal fixed inset-0 z-50 flex items-end justify-center bg-[rgba(5,14,30,0.68)] p-0 backdrop-blur-md sm:items-center sm:p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
      >
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="team-modal__panel relative max-h-[90vh] w-full overflow-y-auto rounded-t-[24px] border border-line bg-surface p-6 shadow-panel sm:max-w-2xl sm:rounded-[24px] sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            ref={closeRef}
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-line/50 bg-surface-2/30 text-ink-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-mint hover:text-mint"
            aria-label="Close team list"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="mb-6 flex items-center gap-3 border-b border-line/40 pb-5 pr-14">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint/10">
              <Users size={20} className="text-mint" />
            </div>
            <div>
              <h2 id="team-modal-title" className="font-display text-lg font-semibold text-ink">
                {member.roleBadge}
              </h2>
              <p className="text-sm text-ink-muted">
                {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Team members grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {teamMembers.map((teamMember, index) => {
              const s = teamMember.socials
              const iconBtn =
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line/40 bg-surface-2/30 text-ink-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-mint hover:text-mint'
              return (
                <motion.div
                  key={teamMember.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 rounded-xl border border-line/30 bg-surface-2/20 p-3 transition-colors hover:border-line/50"
                >
                  {/* Avatar */}
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line/40 bg-surface">
                    {teamMember.photo ? (
                      <Image
                        src={teamMember.photo}
                        alt={teamMember.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                        style={
                          teamMember.photoFocus
                            ? { objectPosition: teamMember.photoFocus }
                            : undefined
                        }
                      />
                    ) : (
                      <span className="font-display text-sm font-semibold text-mint">
                        {initials(teamMember.name)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold text-ink">{teamMember.name}</p>
                    <p className="truncate text-xs text-ink-muted">{teamMember.title}</p>
                  </div>

                  {/* Social icons — only the ones the member actually has */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    {s.linkedin && (
                      <a
                        href={s.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${teamMember.name} on LinkedIn`}
                        className={iconBtn}
                      >
                        <LinkedInIcon size={15} />
                      </a>
                    )}
                    {s.github && (
                      <a
                        href={s.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${teamMember.name} on GitHub`}
                        className={iconBtn}
                      >
                        <GitHubIcon size={15} />
                      </a>
                    )}
                    {s.email && (
                      <a
                        href={`mailto:${s.email}`}
                        aria-label={`Email ${teamMember.name}`}
                        className={iconBtn}
                      >
                        <Mail size={15} />
                      </a>
                    )}
                    {s.instagram && (
                      <a
                        href={s.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${teamMember.name} on Instagram`}
                        className={iconBtn}
                      >
                        <InstagramIcon size={15} />
                      </a>
                    )}
                    {s.whatsapp && (
                      <a
                        href={s.whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${teamMember.name} on WhatsApp`}
                        className={iconBtn}
                      >
                        <WhatsAppIcon size={15} />
                      </a>
                    )}
                    {s.website && (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${teamMember.name}'s website`}
                        className={iconBtn}
                      >
                        <Globe size={15} />
                      </a>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
