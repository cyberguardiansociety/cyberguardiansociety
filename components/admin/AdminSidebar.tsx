'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Activity,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  LogOut,
  Mail,
  Menu,
  Mic,
  Package,
  BookOpen,
  RefreshCw,
  UserCog,
  Users,
  Settings,
  X,
} from 'lucide-react'
import { signOut } from '@/app/admin/actions'

const viewPermission: Record<string, string> = {
  inbox: 'inbox',
  applications: 'applications',
  'speaker-applications': 'speaker_applications',
  activity: 'audit',
  announcements: 'content_announcement',
  products: 'content_product',
  merchandise: 'content_merchandise',
  resources: 'content_resource',
  sessions: 'sessions',
  'time-management': 'sessions',
  attendance: 'sessions',
  registrants: 'sessions',
  'google-sync': 'google_sync',
  administrators: 'admins',
}

const groups = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview',             label: 'Overview',             href: '?view=overview',            icon: LayoutDashboard },
      { id: 'inbox',                label: 'Inbox',                href: '?view=inbox',               icon: Mail },
      { id: 'applications',         label: 'Applications',         href: '?view=applications',        icon: ClipboardList },
      { id: 'speaker-applications', label: 'Speaker applications', href: '?view=speaker-applications', icon: Mic },
      { id: 'activity',             label: 'Audit log',            href: '?view=activity',            icon: Activity },
    ],
  },
  {
    label: 'Sessions & Operations',
    items: [
      { id: 'sessions',        label: 'Online sessions', href: '?view=sessions',        icon: CalendarDays },
      { id: 'time-management', label: 'Time management', href: '?view=time-management', icon: CalendarClock },
      { id: 'attendance',      label: 'Attendance',      href: '?view=attendance',      icon: ClipboardCheck },
      { id: 'registrants',     label: 'Registrants',     href: '?view=registrants',     icon: Users },
      { id: 'google-sync',     label: 'Google sync',     href: '?view=google-sync',     icon: RefreshCw },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'announcements', label: 'Announcements',  href: '?view=announcements', icon: Megaphone },
      { id: 'products',      label: 'Products',       href: '?view=products',      icon: Package },
      { id: 'resources',     label: 'Free resources', href: '?view=resources',     icon: BookOpen },
    ],
  },
  {
    label: 'Administration',
    items: [
      { id: 'administrators', label: 'Administrators',       href: '?view=administrators', icon: UserCog },
      { id: 'settings',       label: 'Settings management',  href: '?view=settings',       icon: Settings },
    ],
  },
] as const

export default function AdminSidebar({
  activeView,
  email,
  role,
  permissionKeys,
}: {
  activeView: string
  email: string
  role: string
  permissionKeys: string[]
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pendingView, setPendingView] = useState<string | null>(null)

  useEffect(() => {
    setPendingView(null)
  }, [activeView])

  function navigation(onNavigate?: () => void, showLabels = false) {
    return (
      <nav aria-label="Admin sections" className="admin-nav">
        {groups.map((group) => {
          const visibleItems = group.items.filter(({ id }) => {
            if (id === 'settings') return role === 'super_admin'
            if (id === 'overview' || role === 'admin' || role === 'super_admin') return true
            if (id === 'sessions' || id === 'google-sync') return ['sessions', 'speakers', 'google_sync'].some((key) => permissionKeys.includes(key))
            return permissionKeys.includes(viewPermission[id] ?? id)
          })
          if (!visibleItems.length) return null
          return (
            <div className="admin-nav__group" key={group.label}>
              {showLabels && <p className="admin-nav__label">{group.label}</p>}
              {visibleItems.map(({ id, label, href, icon: Icon }) => {
                const isSelected = (pendingView ?? activeView) === id
                return (
                  <Link
                    key={id}
                    href={href}
                    prefetch={true}
                    scroll={false}
                    onClick={() => {
                      setPendingView(id)
                      onNavigate?.()
                    }}
                    aria-current={isSelected ? 'page' : undefined}
                    title={label}
                    className="admin-nav__link"
                    data-active={isSelected}
                  >
                    <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                    {showLabels && <span className="admin-nav__link-text">{label}</span>}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>
    )
  }

  function bottomActions(showLabels = false) {
    return (
      <div className="admin-sidebar__bottom">
        <div className="admin-identity">
          <span className="admin-identity__avatar" aria-hidden="true">
            {email.slice(0, 1).toUpperCase()}
          </span>
          {showLabels && (
            <span className="admin-identity__text">
              <strong>{email}</strong>
              <small>{role.replace('_', ' ')}</small>
            </span>
          )}
        </div>
        <form action={signOut}>
          <button className="admin-logout-btn" type="submit" aria-label="Sign out" title="Sign out">
            <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="admin-logout-label">Sign out</span>
          </button>
        </form>
      </div>
    )
  }

  return (
    <>
      {/* Desktop: icon-only rail that expands on hover */}
      <aside
        className="admin-sidebar admin-sidebar--rail"
        aria-label="Admin navigation"
      >
        <nav aria-label="Admin sections" className="admin-nav">
          {groups.map((group) => {
            const visibleItems = group.items.filter(({ id }) => {
              if (id === 'settings') return role === 'super_admin'
              if (id === 'overview' || role === 'admin' || role === 'super_admin') return true
              if (id === 'sessions' || id === 'google-sync') return ['sessions', 'speakers', 'google_sync'].some((key) => permissionKeys.includes(key))
              return permissionKeys.includes(viewPermission[id] ?? id)
            })
            if (!visibleItems.length) return null
            return (
              <div className="admin-nav__group" key={group.label}>
                <p className="admin-nav__label">{group.label}</p>
                {visibleItems.map(({ id, label, href, icon: Icon }) => {
                  const isActive = activeView === id
                  return (
                    <Link
                      key={id}
                      href={href}
                      prefetch={true}
                      aria-current={isActive ? 'page' : undefined}
                      title={label}
                      className="admin-nav__link"
                      data-active={isActive}
                    >
                      <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                      <span className="admin-nav__link-text">{label}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
        <div className="admin-sidebar__bottom">
          <div className="admin-identity">
            <span className="admin-identity__avatar" aria-hidden="true">
              {email.slice(0, 1).toUpperCase()}
            </span>
            <span className="admin-identity__text">
              <strong>{email}</strong>
              <small>{role.replace('_', ' ')}</small>
            </span>
          </div>
          <form action={signOut}>
            <button className="admin-logout-btn" type="submit" aria-label="Sign out" title="Sign out">
              <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="admin-logout-label">Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile hamburger */}
      <header className="admin-mobile-menu">
        <button
          className="admin-icon-action"
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin navigation"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile drawer — full labels */}
      {mobileOpen ? (
        <div className="admin-drawer-backdrop">
          <button
            className="admin-drawer-dismiss"
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="admin-mobile-drawer" aria-label="Admin navigation">
            <button
              className="admin-icon-action admin-drawer-close"
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close admin navigation"
            >
              <X size={18} />
            </button>
            {navigation(() => setMobileOpen(false), true)}
            {bottomActions(true)}
          </aside>
        </div>
      ) : null}
    </>
  )
}
