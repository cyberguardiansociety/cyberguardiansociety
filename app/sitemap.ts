import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/seo'

const indexablePages = [
  '/',
  '/about',
  '/services',
  '/team',
  '/products',
  '/merch',
  '/announcements',
  '/contact',
  '/join-cgs',
  '/join-as-speaker',
  '/privacy',
  '/terms',
  '/code-of-conduct',
]

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return []

  return indexablePages.map((path) => ({
    url: new URL(path, siteUrl).toString(),
  }))
}
