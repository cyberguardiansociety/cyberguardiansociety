import Link from 'next/link'
import { CalendarClock, CalendarDays, ClipboardCheck, Mic, RefreshCw, Users } from 'lucide-react'

const sections = [
  { id: 'sessions', label: 'Sessions management', icon: CalendarDays },
  { id: 'time-management', label: 'Time management', icon: CalendarClock },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'registrants', label: 'Registrants', icon: Users },
  { id: 'speakers', label: 'Speakers', icon: Mic },
  { id: 'google-sync', label: 'Google sync', icon: RefreshCw },
] as const

export default function AdminSessionNav({ activeView, role, permissionKeys }: { activeView: string; role: string; permissionKeys: string[] }) {
  const visibleSections = sections.filter(({ id }) => {
    if (role === 'admin' || role === 'super_admin') return true
    if (id === 'speakers') return permissionKeys.includes('speakers')
    if (id === 'google-sync') return permissionKeys.includes('google_sync')
    return permissionKeys.includes('sessions')
  })

  return (
    <nav className="admin-ops-nav" aria-label="Session management sections">
      {visibleSections.map(({ id, label, icon: Icon }) => (
        <Link
          key={id}
          href={`/admin?view=${id}`}
          prefetch={true}
          scroll={false}
          aria-current={activeView === id ? 'page' : undefined}
          data-active={activeView === id}
          className="admin-ops-nav__link"
        >
          <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}