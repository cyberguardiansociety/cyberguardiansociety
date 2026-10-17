
import type { Metadata } from 'next'
import {
  ArrowUpRight,
  Backpack,
  Coffee,
  HardHat,
  Keyboard,
  Laptop,
  LockKeyhole,
  NotebookPen,
  Package,
  PlugZap,
  Radio,
  Shield,
  Shirt,
  Smartphone,
  Sticker,
  Wind,
  Wrench,
} from 'lucide-react'
import Container from '@/components/ui/Container'
import ManagedContentCards from '@/components/ManagedContentCards'
import { readPublicManagedContent } from '@/lib/site-content'
import { canonicalMetadata } from '@/lib/seo'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Cyber Guardian Society merchandise',
  description: 'Browse Cyber Guardian Society community merchandise, including apparel and practical accessories for cybersecurity practitioners.',
  ...canonicalMetadata('/merch'),
}

const collections = [
  {
    number: '01',
    title: 'Tech apparel',
    category: 'FIELD UNIFORM',
    products: [
      {
        name: 'Signal Hoodie',
        detail: 'Heavyweight tactical fleece',
        icon: Shirt,
      },
      {
        name: 'Circuitline Shell',
        detail: 'All-weather windbreaker',
        icon: Wind,
      },
      {
        name: 'Guardian Tee',
        detail: 'Premium fitted cotton',
        icon: Shield,
      },
      {
        name: 'Gridcode Cap',
        detail: 'Structured six-panel cap',
        icon: HardHat,
      },
      {
        name: 'Response Bomber',
        detail: 'Reflective utility layer',
        icon: Shield,
      },
    ],
  },
  {
    number: '02',
    title: 'Everyday gear',
    category: 'DAILY CARRY',
    products: [
      {
        name: 'Thermal Field Bottle',
        detail: 'Insulated stainless steel',
        icon: Package,
      },
      {
        name: 'Modular Ops Pack',
        detail: 'Expandable carry system',
        icon: Backpack,
      },
      {
        name: 'Nightshift Desk Mat',
        detail: 'Extended precision surface',
        icon: Keyboard,
      },
      {
        name: 'Carbon Shell Case',
        detail: 'Shockproof phone protection',
        icon: Smartphone,
      },
      {
        name: 'Reactive Code Mug',
        detail: 'Heat-reactive ceramic',
        icon: Coffee,
      },
    ],
  },
  {
    number: '03',
    title: 'Nomad & novelty',
    category: 'MOBILE OFFICE',
    products: [
      {
        name: 'Circuit Sleeve',
        detail: 'Padded aluminum laptop fit',
        icon: Laptop,
      },
      {
        name: 'Guardian Multi-tool',
        detail: 'Pocket-sized utility kit',
        icon: Wrench,
      },
      {
        name: 'Threat Notes',
        detail: 'Hardbound field journal',
        icon: NotebookPen,
      },
      {
        name: 'Signal Sticker Set',
        detail: 'Die-cut vinyl collection',
        icon: Sticker,
      },
      {
        name: 'Halo Charge Pad',
        detail: 'Wireless charging surface',
        icon: PlugZap,
      },
    ],
  },
] as const

export default async function MerchPage() {
  const managedMerchandise = await readPublicManagedContent('merchandise')
  return (
    <main id="main" className="merch-page pb-16 pt-10 sm:pb-24 sm:pt-14">
      <Container>
        <header className="merch-masthead hero-world-map">
          <div className="merch-masthead__topline">
            <span>CGS / FIELD GOODS</span>
            <span className="merch-live"><Radio size={13} aria-hidden="true" /> COLLECTION PREVIEW</span>
          </div>
          <div className="merch-masthead__content">
            <div>
              <p className="eyebrow">CyberGuardianSociety supply</p>
              <h1 className="merch-title">Built for the signal.</h1>
              <p className="merch-intro">
                Field-ready essentials for the people defending what matters.
              </p>
            </div>
            <div className="merch-count" aria-label="15 items across 3 collections">
              <span>15</span>
              <span>ITEMS / 03 SETS</span>
            </div>
          </div>
        </header>

        {managedMerchandise.length ? (
          <section className="section--tight" aria-label="Cyber Guardian Society merchandise">
            <ManagedContentCards items={managedMerchandise} />
          </section>
        ) : (
          <div className="merch-collections" aria-label="Cyber Guardian Society merchandise">
            {collections.map((collection) => (
            <section
              key={collection.number}
              className="merch-collection"
              aria-labelledby={`merch-collection-${collection.number}`}
            >
              <div className="merch-collection__heading">
                <div className="flex items-center gap-3">
                  <span className="merch-collection__number">{collection.number}</span>
                  <div>
                    <p className="merch-collection__eyebrow">{collection.category}</p>
                    <h2 id={`merch-collection-${collection.number}`} className="merch-collection__title">
                      {collection.title}
                    </h2>
                  </div>
                </div>
                <span className="merch-collection__count">05 PRODUCTS</span>
              </div>

              <div className="merch-row-scroll" role="region" aria-label={`${collection.title} products`} tabIndex={0}>
                <ul className="merch-product-row">
                  {collection.products.map((product, index) => (
                    <li key={product.name} className="merch-product-card">
                      <div className="merch-product-art">
                        <span className="merch-product-art__index">
                          {collection.number}.{String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="merch-product-art__symbol" aria-hidden="true">
                          <product.icon size={64} strokeWidth={1.15} />
                        </span>
                        <span className="merch-product-art__scan" aria-hidden="true" />
                        <span className="merch-product-art__tag">CGS / 2026</span>
                      </div>
                      <div className="merch-product-info">
                        <div className="merch-product-info__title">
                          <div>
                            <h3>{product.name}</h3>
                            <p>{product.detail}</p>
                          </div>
                          <ArrowUpRight size={15} aria-hidden="true" />
                        </div>
                        <button className="merch-coming-soon" type="button" disabled>
                          <LockKeyhole size={13} aria-hidden="true" />
                          Coming Soon
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
            ))}
          </div>
        )}
      </Container>
    </main>
  )
}
