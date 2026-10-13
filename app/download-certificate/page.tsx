import type { Metadata } from 'next'
import Container from '@/components/ui/Container'
import CertificateLookup from '@/components/CertificateLookup'

export const metadata: Metadata = {
  title: 'Download your certificate',
  description: 'Verify and download your Cyber Guardian Society session participation certificate.',
  robots: { index: false, follow: false },
}

export default async function DownloadCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code = '' } = await searchParams

  return (
    <main id="main" className="certificate-page hero-world-map">
      <Container>
        <header className="certificate-page__intro">
          <p className="eyebrow">Your learning, on record</p>
          <h1>Download your certificate.</h1>
          <p>Enter the certificate ID from your attendance confirmation. We’ll verify it before preparing your PDF.</p>
        </header>
        <CertificateLookup mode="download" initialCode={code} />
      </Container>
    </main>
  )
}
