import Link from 'next/link'
import type { ManagedContentItem } from '@/lib/site-content'

export default function ManagedContentCards({ items }: { items: ManagedContentItem[] }) {
  return (
    <ul className="managed-content-grid">
      {items.map((item) => {
        const external = Boolean(item.action_url?.startsWith('https://'))
        return (
          <li className="managed-content-card" key={item.id}>
            {item.image_url ? (
              <img className="managed-content-card__image grayscale-0" src={item.image_url} alt="" loading="lazy" />
            ) : (
              <div className="managed-content-card__image managed-content-card__image--empty" aria-hidden="true">
                {item.category || 'CGS'}
              </div>
            )}
            <div className="managed-content-card__body">
              {item.category ? <p className="eyebrow">{item.category}</p> : null}
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              {item.price !== null ? <strong className="managed-content-card__price">{item.currency} {item.price.toFixed(2)}</strong> : null}
              {item.action_url ? (
                external ? (
                  <a href={item.action_url} target="_blank" rel="noopener noreferrer" className="managed-content-card__link">View details</a>
                ) : (
                  <Link href={item.action_url} className="managed-content-card__link">View details</Link>
                )
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
