'use client'

import { servicesPage } from '@/data/site'
import BasicAccordion from '@/components/smoothui/components/basic-accordion'
import Container from '@/components/ui/Container'

export default function ServicesFaq() {
  return (
    <section className="section border-y border-line bg-surface" aria-labelledby="services-faq-heading">
      <Container>
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-14">
          <div className="min-w-0 lg:pt-3">
            <p className="eyebrow">Service FAQ</p>
            <h2
              id="services-faq-heading"
              className="mt-3 max-w-[15ch] font-heading text-3xl font-semibold sm:text-4xl"
            >
              {servicesPage.faq.heading}
            </h2>
            <p className="mt-4 max-w-[42ch] text-sm leading-6 text-ink-muted">
              {servicesPage.faq.sub}
            </p>
            <p className="mt-7 text-xs font-semibold uppercase text-ink-muted">
              {String(servicesPage.faq.items.length).padStart(2, '0')} questions
            </p>
          </div>
          <BasicAccordion
            className="min-w-0"
            items={servicesPage.faq.items}
          />
        </div>
      </Container>
    </section>
  )
}
