import type { Metadata } from 'next'
import Container from '@/components/ui/Container'
import CertificateLookup from '@/components/CertificateLookup'

export const metadata: Metadata = {
  title: 'Verify a certificate',
  description: 'Check a Cyber Guardian Society certificate against a recorded session attendance.',
  robots: { index: false, follow: false },
}

export default async function VerifyCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code = '' } = await searchParams

  return (
    <main id="main" className="certificate-page hero-world-map">
      <Container>
        <header className="certificate-page__intro">
          <p className="eyebrow">Trust, checked</p>
          <h1>Verify a CGS certificate.</h1>
          <p>Enter the certificate ID to confirm it matches an attendance record from a Cyber Guardian Society session.</p>
        </header>
        <CertificateLookup mode="verify" initialCode={code} />
      </Container>
    </main>
  )
}
