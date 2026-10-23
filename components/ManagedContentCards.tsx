import Link from 'next/link'
import type { ManagedContentItem } from '@/lib/site-content'
import { safeContentUrl } from '@/lib/utils'

export default function ManagedContentCards({ items }: { items: ManagedContentItem[] }) {
  return (
    <ul className="managed-content-grid">
      {items.map((item) => {
        const safeAction = safeContentUrl(item.action_url)
        const safeImage = safeContentUrl(item.image_url)
        const external = Boolean(safeAction?.startsWith('https://'))
        return (
          <li className="managed-content-card" key={item.id}>
            {safeImage ? (
              <img className="managed-content-card__image grayscale-0" src={safeImage} alt="" loading="lazy" />
            ) : (
              <div className="managed-content-card__image managed-content-card__image--empty" aria-hidden="true">
                {item.category || 'CGS'}
              </div>
            )}
            <div className="managed-content-card__body">
              {item.category ? <p className="eyebrow">{item.category}</p> : null}
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              {safeAction ? (
                external ? (
                  <a href={safeAction} target="_blank" rel="noopener noreferrer" className="managed-content-card__link">View details</a>
                ) : (
                  <Link href={safeAction} className="managed-content-card__link">View details</Link>
                )
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
