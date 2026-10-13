'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, CalendarDays, ChevronDown, Download, Menu, ShieldCheck, Sparkles, X } from 'lucide-react'
import { org } from '@/data/site'
import ClayButton from '@/components/ui/ClayButton'
import Container from '@/components/ui/Container'

const MENU_TOGGLE_ID = 'nav-menu-toggle'
const megaMenus = [
  {
    id: 'explore',
    label: 'Explore',
    groups: [
      {
        title: 'The society',
        items: [
          { label: 'About CGS', href: '/about', description: 'Meet the people and principles behind CGS.' },
          { label: 'Our team', href: '/team', description: 'Get to know the volunteers leading the work.' },
          { label: 'Member stories', href: '/testimonials', description: 'Hear from people in the community.' },
          { label: 'Announcements', href: '/announcements', description: 'Read the latest updates from the society.' },
        ],
      },
      {
        title: 'Explore our work',
        items: [
          { label: 'Services', href: '/services', description: 'Readiness, intelligence, training, and response.' },
          { label: 'Products', href: '/products', description: 'Tools and resources built for defenders.' },
          { label: 'Contact', href: '/contact', description: 'Start a conversation with our team.' },
        ],
      },
    ],
  },
  {
    id: 'sessions',
    label: 'Sessions',
    groups: [
      {
        title: 'Learn together',
        items: [
          { label: 'Browse sessions', href: '/#sessions', description: 'Find live briefings and upcoming sessions.' },
          { label: 'Attendance', href: '/attendance', description: 'Check in to a session you attended.' },
        ],
      },
    ],
  },
  {
    id: 'speaker',
    label: 'Join as a speaker',
    groups: [
      {
        title: 'Share what you know',
        items: [
          { label: 'Apply to speak', href: '/join-as-speaker', description: 'Propose a practical session for the CGS community.' },
        ],
      },
    ],
  },
  {
    id: 'resources',
    label: 'Resources',
    groups: [
      {
        title: 'Free resources',
        items: [
          { label: 'Resource library', href: '/products#resources', description: 'Browse sessions, practical learning, and CGS community guides.' },
          { label: 'Browse sessions', href: '/#sessions', description: 'Find live briefings and upcoming session dates.' },
          { label: 'Cyber training', href: '/services', description: 'Explore hands-on labs and learning tracks.' },
        ],
      },
    ],
  },
  {
    id: 'certificates',
    label: 'Certificates',
    groups: [
      {
        title: 'Your records',
        items: [
          { label: 'Verify certificate', href: '/verify-certificate', description: 'Check that a CGS certificate is authentic.' },
          { label: 'Download certificate', href: '/download-certificate', description: 'Open and save your participation certificate.' },
        ],
      },
    ],
  },
] as const

const featureItems = [
  { label: 'Sessions', href: '/#sessions', icon: CalendarDays },
  { label: 'Attendance', href: '/attendance', icon: ShieldCheck },
  { label: 'Certificates', href: '/verify-certificate', icon: Download },
] as const

export default function Navbar() {
  const pathname = usePathname()
  const reduceMotion = Boolean(useReducedMotion())
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // The bar is fully transparent over the hero and only gains a surface once the
  // page scrolls, so the top of the page reads as one continuous layout.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
    setActiveMegaMenu(null)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        document.getElementById(MENU_TOGGLE_ID)?.focus()
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.querySelector<HTMLElement>('a')?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!activeMegaMenu) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveMegaMenu(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeMegaMenu])

  return (
    <header
      data-scrolled={scrolled ? 'true' : 'false'}
      data-home={pathname === '/' ? 'true' : 'false'}
      onMouseLeave={() => setActiveMegaMenu(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActiveMegaMenu(null)
      }}
      className={`site-navbar sticky top-0 z-50 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300 data-[scrolled=true]:border-line data-[scrolled=true]:backdrop-blur-md data-[scrolled=true]:shadow-none ${pathname === '/' ? 'site-navbar--over-hero' : ''}`}
    >
      <Container>
        <div className="flex h-16 items-center justify-between gap-3">
          <Link
            href="/"
            className="-ml-1 flex min-w-0 items-center gap-2.5 rounded-lg py-1 pl-1 pr-2"
            aria-label={`${org.name} — home`}
          >
            <Image
              src={org.logo}
              alt=""
              width={40}
              height={40}
              priority
              className="h-10 w-10 shrink-0 grayscale-0"
            />
            <span className="hidden truncate font-sans text-[15px] font-semibold min-[380px]:inline sm:text-[17px]">
              {org.fullName}
            </span>
            <span aria-hidden="true" className="font-sans text-[13px] font-semibold min-[380px]:hidden">
              CGS
            </span>
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {megaMenus.map((menu) => {
                const isOpen = activeMegaMenu === menu.id
                return (
                  <li key={menu.id}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`mega-menu-${menu.id}`}
                      onMouseEnter={() => setActiveMegaMenu(menu.id)}
                      onFocus={() => setActiveMegaMenu(menu.id)}
                      onClick={() => setActiveMegaMenu(isOpen ? null : menu.id)}
                      className={`nav-menu-trigger inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-surface-2 hover:text-ink ${isOpen ? 'bg-surface-2 text-ink' : 'text-ink-muted'}`}
                    >
                      {menu.label}
                      <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <ClayButton href={org.joinHref} variant="primary" size="sm" className="hidden sm:inline-flex">
              Join CGS
            </ClayButton>

            <ClayButton
              id={MENU_TOGGLE_ID}
              variant="neutral"
              iconOnly
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls={open ? 'site-menu' : undefined}
              className="lg:hidden"
              onClick={() => setOpen((value) => !value)}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={open ? 'close-icon' : 'menu-icon'}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.72, rotate: open ? -80 : 80 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.72, rotate: open ? 80 : -80 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 26, mass: 0.55 }
                  }
                  className="inline-flex"
                >
                  {open ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
                </motion.span>
              </AnimatePresence>
            </ClayButton>
          </div>
        </div>
      </Container>

      <AnimatePresence initial={false} mode="wait">
        {activeMegaMenu ? (
          <motion.div
            key={activeMegaMenu}
            id={`mega-menu-${activeMegaMenu}`}
            role="region"
            aria-label={`${megaMenus.find((menu) => menu.id === activeMegaMenu)?.label} links`}
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
            className="nav-mega-menu hidden lg:block"
            onMouseEnter={() => setActiveMegaMenu(activeMegaMenu)}
          >
            <Container>
              <div className="nav-mega-layout">
                <div className="nav-mega-groups">
                  {megaMenus.find((menu) => menu.id === activeMegaMenu)?.groups.map((group) => (
                    <section key={group.title} aria-labelledby={`mega-heading-${activeMegaMenu}-${group.title}`}>
                      <h2 id={`mega-heading-${activeMegaMenu}-${group.title}`} className="nav-mega-heading">
                        {group.title}
                      </h2>
                      <ul className="nav-mega-links">
                        {group.items.map((item) => (
                          <li key={item.href}>
                            <Link href={item.href} onClick={() => setActiveMegaMenu(null)} className="nav-mega-link">
                              <span>
                                <strong>{item.label}</strong>
                                <small>{item.description}</small>
                              </span>
                              <ArrowUpRight size={15} aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
                <aside className="nav-mega-feature">
                  <div className="nav-mega-feature__mark"><Sparkles size={19} aria-hidden="true" /></div>
                  <p className="eyebrow">Defend together</p>
                  <h2>Find your next step.</h2>
                  <p>Learn with the community, check in, or keep your session record close.</p>
                  <ul>
                    {featureItems.map((item) => {
                      const FeatureIcon = item.icon
                      return (
                        <li key={item.label}>
                          <Link href={item.href} onClick={() => setActiveMegaMenu(null)}>
                            <FeatureIcon size={15} aria-hidden="true" />
                            {item.label}
                            <ArrowUpRight size={13} aria-hidden="true" />
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </aside>
              </div>
            </Container>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.button
            key="mobile-menu-backdrop"
            type="button"
            aria-label="Close site menu"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 0.42 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 top-16 z-40 bg-ink lg:hidden"
            onClick={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="site-menu"
            id="site-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={reduceMotion ? false : { x: '100%', opacity: 0.7 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: '100%', opacity: 0.7 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 320, damping: 34, mass: 0.85 }
            }
            className="fixed bottom-0 right-0 top-16 z-50 w-[calc(100vw-3rem)] max-w-sm overflow-y-auto border-l border-line bg-bg shadow-panel lg:hidden"
          >
            <Container className="py-6">
              <nav aria-label="Mobile">
                {megaMenus.map((menu) => (
                  <section key={menu.id} className="mb-6">
                    <h2 className="mb-1 font-display text-xs font-semibold uppercase tracking-[0.12em] text-mint">
                      {menu.label}
                    </h2>
                    {menu.groups.map((group) => (
                      <div key={group.title}>
                        <p className="mb-1 mt-3 text-[11px] font-medium text-ink-muted">{group.title}</p>
                        <ul>
                          {group.items.map((item) => (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                aria-current={pathname === item.href ? 'page' : undefined}
                                onClick={() => setOpen(false)}
                                className={`menu-row ${pathname === item.href ? 'text-mint' : ''}`}
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </section>
                ))}
              </nav>
              <div className="mt-8 grid gap-3">
                <ClayButton href={org.joinHref} variant="primary" className="w-full">
                  Join CGS
                </ClayButton>
              </div>
            </Container>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
