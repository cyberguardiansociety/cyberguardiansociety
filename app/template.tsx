'use client'

import { usePathname } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'

/**
 * A template remounts on every navigation, so this runs once per route change.
 * The Navbar and Footer live in the layout and are deliberately excluded — only
 * the page content animates, which keeps the shell steady while pages glide in.
 *
 * Admin routes skip the transition entirely to keep query-param-driven view
 * switches instant (the admin panel navigates via ?view= search params).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  const pathname = usePathname()
  const isAdmin = pathname.includes('/admin') || pathname.startsWith('/cgs-')

  if (isAdmin || reduceMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}