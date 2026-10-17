import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Radio,
  Shield,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react'
import type { OnlineSession } from '@/data/site'
import Container from '@/components/ui/Container'
import { readPublicOnlineSessions } from '@/lib/supabase/sessions'

function LiveSessionHero({ session }: { session: OnlineSession }) {
  const isExternal = session.href.startsWith('http')

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-surface to-blue-950/20 p-6 shadow-2xl shadow-emerald-950/30 sm:p-8 lg:p-10">
      {/* Decorative cyber ambient glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          {/* Live indicator chip */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-3 py-1 text-xs font-bold tracking-wide text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              BROADCASTING LIVE NOW
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
              <Video size={13} className="text-blue-400" />
              {session.platform}
            </span>
          </div>

          <h3 className="mt-4 font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl">
            {session.title}
          </h3>

          <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
            {session.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-ink-muted">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <Calendar size={14} className="text-emerald-400" />
              {session.date}
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <Clock size={14} className="text-blue-400" />
              {session.time}
            </span>
          </div>
        </div>

        {/* Action button cluster */}
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
          {isExternal ? (
            <a
              href={session.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40 active:scale-95"
            >
              <Radio size={16} className="animate-pulse" />
              <span>Join Live Stream</span>
              <ArrowUpRight size={16} />
            </a>
          ) : (
            <Link
              href={session.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40 active:scale-95"
            >
              <Radio size={16} className="animate-pulse" />
              <span>Join Live Stream</span>
              <ArrowUpRight size={16} />
            </Link>
          )}

          <Link
            href="/attendance"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-surface/80 px-6 py-3.5 text-sm font-semibold text-emerald-400 backdrop-blur-md transition-all hover:border-emerald-400 hover:bg-emerald-950/20 active:scale-95"
          >
            <ShieldCheck size={16} />
            <span>Mark Attendance</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

function UpcomingSessionCard({ session }: { session: OnlineSession }) {
  const isExternal = session.href.startsWith('http')

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface/70 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-950/20 sm:p-7">
      {/* Subtle top glow bar on hover */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/0 to-transparent transition-all duration-300 group-hover:via-blue-500/70" />

      <div>
        {/* Meta badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-muted/60 px-2.5 py-1 text-xs font-medium text-ink-muted">
            <CalendarDays size={13} className="text-blue-400" />
            <span>{session.date}</span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
            <Video size={13} className="text-slate-400" />
            {session.platform}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-4 font-heading text-lg font-bold tracking-tight text-ink transition-colors group-hover:text-blue-400 sm:text-xl">
          {session.title}
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-ink-muted line-clamp-3">
          {session.description}
        </p>

        {/* Time metadata */}
        <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
          <Clock size={13} className="text-blue-400" />
          <span>{session.time}</span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4">
        {isExternal ? (
          <a
            href={session.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-mint transition-colors hover:underline"
          >
            <span>Save your spot</span>
            <ArrowUpRight size={14} />
          </a>
        ) : (
          <Link
            href={session.href}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-mint transition-colors hover:underline"
          >
            <span>Save your spot</span>
            <ArrowUpRight size={14} />
          </Link>
        )}

        <Link
          href="/attendance"
          className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted transition-colors hover:text-ink hover:underline"
        >
          <Shield size={12} className="text-emerald-400" />
          <span>Attendance</span>
        </Link>
      </div>
    </article>
  )
}

export default async function Sessions() {
  const sessions = await readPublicOnlineSessions()
  const liveSessions = sessions.current
  const upcomingSessions = sessions.upcoming
  const totalCount = liveSessions.length + upcomingSessions.length

  return (
    <section id="sessions" className="section relative border-y border-line bg-surface" aria-labelledby="sessions-heading">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-500/5 to-transparent" aria-hidden="true" />

      <Container>
        {/* Section Header */}
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 backdrop-blur-md">
              <Sparkles size={13} className="text-blue-400" />
              <span>Interactive Learning Hub</span>
            </div>

            <h2
              id="sessions-heading"
              className="mt-3 font-heading text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl"
            >
              Live &amp; Upcoming Sessions
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
              Join interactive cybersecurity briefings, masterclasses, and hands-on bootcamps. Check into live sessions to record verified attendance.
            </p>
          </div>

          {/* Quick Counter Chips */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink">
              <span className={`h-2 w-2 rounded-full ${liveSessions.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {liveSessions.length} Live Now
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink">
              <Calendar size={13} className="text-blue-400" />
              {upcomingSessions.length} Scheduled
            </span>
          </div>
        </div>

        {/* Live Session Featured Hero Section (if any live) */}
        {liveSessions.length > 0 && (
          <div className="mt-10 space-y-6">
            {liveSessions.map((session) => (
              <LiveSessionHero key={session.id} session={session} />
            ))}
          </div>
        )}

        {/* Upcoming Sessions Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <h3 className="font-heading text-xl font-bold text-ink sm:text-2xl">
              Scheduled Masterclasses &amp; Bootcamps
            </h3>
            <span className="text-xs font-medium text-ink-muted">
              {upcomingSessions.length} session{upcomingSessions.length !== 1 ? 's' : ''} on roster
            </span>
          </div>

          {upcomingSessions.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingSessions.map((session) => (
                <UpcomingSessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-muted/30 p-10 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface border border-line text-blue-400">
                <CalendarDays size={22} />
              </div>
              <h4 className="mt-4 font-heading text-base font-semibold text-ink">No upcoming sessions right now</h4>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-ink-muted">
                New masterclasses and live bootcamps are announced regularly. Check back soon or join our community to get instant notifications.
              </p>
            </div>
          )}
        </div>

        {/* Attendance Portal Direct Shortcut Banner */}
        <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-surface to-blue-950/20 p-5 sm:flex-row sm:p-6">
          <div className="flex items-center gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <strong className="block text-sm font-bold text-ink">Attending an ongoing session?</strong>
              <span className="text-xs text-ink-muted">Verify your attendance directly on the portal to keep your learning record.</span>
            </div>
          </div>
          <Link
            href="/attendance"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500 hover:text-slate-950 active:scale-95"
          >
            <span>Open Attendance Check-in</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </Container>
    </section>
  )
}
