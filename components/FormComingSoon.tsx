import Link from 'next/link'
import { ArrowLeft, Clock3, ShieldCheck } from 'lucide-react'
import Container from '@/components/ui/Container'

export default function FormComingSoon({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <main id="main" className="form-coming-soon">
      <Container>
        <section className="form-coming-soon__card" aria-labelledby="form-coming-soon-title">
          <span className="form-coming-soon__icon"><Clock3 size={23} /></span>
          <p className="eyebrow inline-flex items-center gap-2"><ShieldCheck size={14} /> Cyber Guardian Society</p>
          <h1 id="form-coming-soon-title">{title}</h1>
          <p>{description}</p>
          <Link href="/" className="form-coming-soon__link"><ArrowLeft size={15} /> Return to the home page</Link>
        </section>
      </Container>
    </main>
  )
}
