import type { Metadata } from 'next'
import { ArrowRight, CalendarClock, Check, ShieldCheck, Sparkles } from 'lucide-react'
import Container from '@/components/ui/Container'
import AttendanceCheckinForm from '@/components/attendance/AttendanceCheckinForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Attendance check-in',
  description: 'Verify attendance for a Cyber Guardian Society session.',
  robots: { index: false, follow: false },
}

export default async function AttendancePage() {
  const supabase = await createSupabaseServerClient()
  const { getAllManagedSessions } = await import('@/lib/sessions-store')
  const allSessions = await getAllManagedSessions(supabase)
  const session = allSessions.find((s) => s.is_published && s.is_active && s.attendance_open)
  const scheduledTime = session?.starts_at
    ? new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: session.timezone || 'Asia/Karachi',
    }).format(new Date(session.starts_at))
    : null

  return (
    <main id="main" className="attendance-portal-page hero-world-map">
      <Container>
        <div className="attendance-portal-layout">
          <section className="attendance-portal-intro" aria-labelledby="attendance-heading">
            <p className="eyebrow inline-flex items-center gap-2"><Sparkles size={14} /> CGS sessions</p>
            <h1 id="attendance-heading" className="mt-4 max-w-[13ch] font-heading text-4xl font-semibold leading-tight sm:text-5xl">
              Check in. Keep your learning on record.
            </h1>
            <p className="mt-5 max-w-[48ch] text-ink-muted">
              Use the email you registered with. Once your attendance is confirmed, your verified attendance is recorded.
            </p>
            {session ? (
              <div className="attendance-session-card">
                <span className="attendance-session-card__icon"><CalendarClock size={18} /></span>
                <div>
                  <small>Check-in is open for</small>
                  <strong>{session.title}</strong>
                  <span>{scheduledTime} · {session.timezone || 'Asia/Karachi'}</span>
                </div>
                <span className="attendance-session-card__live"><i /> Open</span>
              </div>
            ) : (
              <div className="attendance-session-card attendance-session-card--quiet">
                <span className="attendance-session-card__icon"><ShieldCheck size={18} /></span>
                <div>
                  <small>Check-in status</small>
                  <strong>No session is taking attendance right now</strong>
                  <span>Check back when your session host opens check-in.</span>
                </div>
              </div>
            )}
            <ol className="attendance-steps">
              <li><span>01</span><div><strong>Confirm your details</strong><small>We’ll match your email to the registration.</small></div></li>
              <li><span>02</span><div><strong>Get your record</strong><small>We’ll confirm when your attendance is saved.</small></div></li>
              <li><span>03</span><div><strong>Verified status</strong><small>Your attendance is confirmed and logged in the society ledger.</small></div></li>
            </ol>
          </section>
          <section className="attendance-portal-panel" aria-labelledby="checkin-panel-heading">
            <div className="attendance-portal-panel__head">
              <span className="attendance-portal-panel__icon"><ShieldCheck size={20} /></span>
              <div>
                <p className="eyebrow">Participant check-in</p>
                <h2 id="checkin-panel-heading">Confirm your attendance</h2>
              </div>
            </div>
            <AttendanceCheckinForm sessionId={session?.id} />
            <p className="attendance-portal-privacy"><Check size={14} /> Only registered participants can check in. Your email is used to find your session registration.</p>
          </section>
        </div>
        <div className="attendance-portal-footnote">
          <span>Need to find a session first?</span>
          <a href="/#sessions">Browse sessions <ArrowRight size={14} /></a>
        </div>
      </Container>
    </main>
  )
}
