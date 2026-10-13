'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Globe, Mail, Users } from 'lucide-react'
import type { TeamMember } from '@/data/site'
import { GitHubIcon, InstagramIcon, LinkedInIcon } from '@/components/ui/SocialIcons'

interface MemberCardProps {
  member: TeamMember
  showViewTeam?: boolean
  onViewTeamClick?: () => void
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

export default function MemberCard({ member, showViewTeam = false, onViewTeamClick }: MemberCardProps) {
  const isFounder = member.level === 1
  const avatarSize = isFounder ? 160 : 110
  const teamCount = member.team?.length || 0

  return (
    <article
      className={`group relative flex w-full flex-col items-center rounded-[24px] border border-line/50 bg-gradient-to-b from-surface-2/30 to-surface p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-line hover:shadow-panel ${
        isFounder ? 'max-w-[480px]' : 'max-w-[360px]'
      }`}
    >
      {/* Founder glow effect */}
      {isFounder && (
        <div className="absolute inset-0 rounded-[24px] bg-mint/5 blur-3xl transition-opacity duration-300 group-hover:bg-mint/10" />
      )}

      {/* Avatar */}
      <div className="relative mb-[-12px]">
        <div
          className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-mint bg-surface shadow-soft`}
          style={{ width: avatarSize, height: avatarSize }}
        >
          {member.photo ? (
            <Image
              src={member.photo}
              alt={member.name}
              fill
              sizes={`${avatarSize}px`}
              className="object-cover grayscale-0"
              style={member.photoFocus ? { objectPosition: member.photoFocus } : undefined}
            />
          ) : (
            <span className="font-display text-2xl font-semibold text-mint">
              {initials(member.name)}
            </span>
          )}
        </div>
      </div>

      {/* Role badge */}
      <div className="mb-3 mt-12 rounded-full border border-line/50 bg-surface-2/50 px-3 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-mint">
          {member.roleBadge}
        </span>
      </div>

      {/* Name */}
      <h3
        className={`font-display font-semibold text-ink ${
          isFounder ? 'text-2xl' : 'text-xl'
        }`}
      >
        {member.name}
      </h3>

      {/* Title */}
      <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-mint">
        {member.title}
      </p>

      {/* Subtitle */}
      <p className="mt-1 text-sm text-ink-muted">{member.subtitle}</p>

      {/* Bio */}
      <p className="mt-4 text-center text-sm leading-relaxed text-ink-muted">
        {member.bio}
      </p>

      {/* Skills chips (founder only) */}
      {member.skills && member.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {member.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-line/30 bg-surface-2/30 px-2.5 py-1 text-[11px] font-medium text-ink-muted"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Highlight badge */}
      {member.highlightBadge && (
        <div className="mt-4 flex items-center gap-2 rounded-full border border-line/50 bg-surface px-3 py-1.5">
          {member.highlightBadge.logo && (
            <span className="text-mint">{member.highlightBadge.logo}</span>
          )}
          <span className="text-xs font-semibold text-ink">{member.highlightBadge.label}</span>
        </div>
      )}

      {/* Social row */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {member.socials.linkedin && (
          <Link
            href={member.socials.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name} on LinkedIn`}
            className="flex items-center gap-2 rounded-full border border-line/50 bg-mint px-3 py-1.5 text-xs font-semibold text-on-mint transition-colors hover:border-mint hover:bg-mint-dim"
          >
            <LinkedInIcon size={14} />
            LinkedIn
          </Link>
        )}
        {member.socials.github && (
          <Link
            href={member.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name} on GitHub`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line/50 bg-surface-2/30 text-ink-muted transition-colors hover:border-mint hover:text-mint"
          >
            <GitHubIcon size={16} />
          </Link>
        )}
        {member.socials.email && (
          <Link
            href={`mailto:${member.socials.email}`}
            aria-label={`Email ${member.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line/50 bg-surface-2/30 text-ink-muted transition-colors hover:border-mint hover:text-mint"
          >
            <Mail size={16} />
          </Link>
        )}
        {member.socials.instagram && (
          <Link
            href={member.socials.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name} on Instagram`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line/50 bg-surface-2/30 text-ink-muted transition-colors hover:border-mint hover:text-mint"
          >
            <InstagramIcon size={16} />
          </Link>
        )}
        {member.socials.website && (
          <Link
            href={member.socials.website}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name}'s website`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line/50 bg-surface-2/30 text-ink-muted transition-colors hover:border-mint hover:text-mint"
          >
            <Globe size={16} />
          </Link>
        )}
      </div>

      {/* View Team button (Level 4 only) */}
      {showViewTeam && teamCount > 0 && (
        <button
          onClick={onViewTeamClick}
          className="group mt-5 inline-flex items-center gap-2 rounded-full border border-line/50 bg-surface-2/30 px-4 py-2 text-xs font-semibold text-ink-muted transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-mint hover:bg-mint/8 hover:text-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
        >
          <Users size={14} className="transition-transform duration-300 group-hover:scale-110" />
          View Team
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mint text-[10px] font-bold text-on-mint shadow-[0_0_0_4px_rgba(59,130,246,0.12)] transition-transform duration-300 group-hover:scale-110">
            {teamCount}
          </span>
        </button>
      )}
    </article>
  )
}
