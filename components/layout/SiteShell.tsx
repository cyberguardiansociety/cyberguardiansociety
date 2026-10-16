'use client'

import { usePathname } from 'next/navigation'

/**
 * Wraps public pages with the site chrome (Navbar + Footer) while leaving the
 * secret admin area clean. The chrome is rendered server-side by the root
 * layout and passed in as props, so only this tiny gating decision runs on
 * the client.
 */
export default function SiteShell({
  adminBasePath,
  navbar,
  footer,
  children,
}: {
  adminBasePath: string
  navbar: React.ReactNode
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdmin =
    pathname === adminBasePath ||
    pathname.startsWith(`${adminBasePath}/`) ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      {navbar}
      {children}
      {footer}
    </>
  )
}
