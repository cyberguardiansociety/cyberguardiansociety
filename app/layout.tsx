import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { initializeDatabase } from '@/lib/db'
import { ADMIN_BASE_PATH } from '@/lib/admin-config'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import SiteShell from '@/components/layout/SiteShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Cyber Guardian Society',
  description: 'Secure Today. Stronger Tomorrow.',
}

// Initialize database on app startup
let dbInitialized = false
async function ensureDatabaseInitialized() {
  if (!dbInitialized) {
    await initializeDatabase()
    dbInitialized = true
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    await ensureDatabaseInitialized()
  } catch (err) {
    // A database failure must never take down the public website.
    console.warn('[db] Database initialization failed:', err)
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SiteShell
          adminBasePath={ADMIN_BASE_PATH}
          navbar={<Navbar />}
          footer={<Footer />}
        >
          {children}
        </SiteShell>
      </body>
    </html>
  )
}
