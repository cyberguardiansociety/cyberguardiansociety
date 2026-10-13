import Link from 'next/link'
import { ArrowUpRight, CalendarDays, Clock3, Radio, Video } from 'lucide-react'
import type { OnlineSession } from '@/data/site'
import Container from '@/components/ui/Container'
import { readPublicOnlineSessions } from '@/lib/supabase/sessions'

function SessionItem({ session, isLive }: { session: OnlineSession; isLive: boolean }) {
  const isExternal = session.href.startsWith('http')
  const action = (
    <>
      {isLive ? 'Join now' : 'Save your spot'}
      <ArrowUpRight size={15} aria-hidden="true" />
    </>
  )

  return (
    <li className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {/* Date and time are metadata — close together */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={14} aria-hidden="true" />
            {session.date}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} aria-hidden="true" />
            {session.time}
          </span>
        </div>
        {/* Title gets breathing room above the metadata */}
        <h4 className="mt-3 font-display text-lg font-semibold tracking-[-0.02em] wrap-anywhere">
          {session.title}
        </h4>
        {/* Description tight to title */}
        <p className="mt-1.5 max-w-[60ch] text-sm leading-6 text-ink-muted">{session.description}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
          <Video size={14} aria-hidden="true" />
          {session.platform}
        </p>
      </div>
      {/* CTAs — give them room to breathe on the right */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 sm:pt-0.5">
        {isExternal ? (
          <a
            href={session.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-mint hover:underline"
          >
            {action}
          </a>
        ) : (
          <Link
            href={session.href}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-mint hover:underline"
          >
            {action}
          </Link>
        )}
        {isLive ? (
          <Link href="/attendance" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink hover:underline">
            Mark attendance
          </Link>
        ) : null}
      </div>
    </li>
  )
}

function SessionList({
  title,
  sessions,
  isLive,
}: {
  title: string
  sessions: OnlineSession[]
  isLive: boolean
}) {
  const Icon = isLive ? Radio : CalendarDays

  return (
    <div>
      <div className="flex min-h-10 items-center justify-between gap-3">
        <h3 className="font-display text-xl font-semibold tracking-[-0.02em]">{title}</h3>
        {isLive && sessions.length > 0 ? (
          <span className="session-live-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" aria-hidden="true" />
            Live
          </span>
        ) : null}
      </div>
      {sessions.length > 0 ? (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {sessions.map((session) => (
            <SessionItem key={session.id} session={session} isLive={isLive} />
          ))}
        </ul>
      ) : (
        /* Empty state — human language, not system-speak */
        <div className="mt-6 flex min-h-28 items-center gap-4 border-y border-line py-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-ink-muted">
            <Icon size={18} aria-hidden="true" />
          </span>
          <p className="text-sm leading-6 text-ink-muted">
            {isLive
              ? 'Nothing live right now — check back soon or join the community to get notified.'
              : 'No sessions scheduled yet. New dates get posted here first.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default async function Sessions() {
  const sessions = await readPublicOnlineSessions()

  return (
    <section id="sessions" className="section border-y border-line bg-surface" aria-labelledby="sessions-heading">
      <Container>
        {/* Section header — eyebrow tight to headline, body slightly pulled away */}
        <div className="max-w-2xl">
          <p className="eyebrow">Learn together</p>
          <h2
            id="sessions-heading"
            className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl"
          >
            Live &amp; upcoming sessions
          </h2>
          <p className="mt-4 text-ink-muted">
            Join a briefing, register for the next session, or watch a recording — all in one place.
          </p>
        </div>
        {/* Session columns get generous top margin from header */}
        <div className="mt-12 grid min-w-0 gap-12 lg:grid-cols-2 lg:gap-16">
          <SessionList title="Live now" sessions={sessions.current} isLive />
          <SessionList title="Coming up" sessions={sessions.upcoming} isLive={false} />
        </div>
      </Container>
    </section>
  )
}
