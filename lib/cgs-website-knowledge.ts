import 'server-only'

import { load } from 'cheerio'

const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_PAGES = 32
const CONCURRENT_PAGES = 6
const MAX_PAGE_CHARS = 7000
const MAX_CONTEXT_CHARS = 56_000
const MAX_RETRIEVED_CHARS = 28_000
const MAX_RETRIEVED_PAGES = 6
const QUERY_STOP_WORDS = new Set([
  'and', 'can', 'does', 'for', 'from', 'how', 'is', 'main', 'of', 'on', 'page', 'tell',
  'that', 'the', 'their', 'this', 'what', 'where', 'which', 'who', 'with', 'you',
])

type CrawledPage = {
  url: string
  title: string
  text: string
  links: string[]
}

let cachedOrigin = ''
let cachedUntil = 0
let cachedPages: CrawledPage[] = []
let pendingCrawl: { origin: string; promise: Promise<CrawledPage[]> } | null = null

function toPublicPageUrl(href: string, origin: string) {
  try {
    const url = new URL(href, origin)
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) return null

    url.hash = ''
    url.search = ''
    url.pathname = url.pathname.replace(/\/+$/, '') || '/'

    if (
      /^\/(?:api|admin|_next|_vercel)(?:\/|$)/i.test(url.pathname) ||
      /\.(?:avif|css|gif|ico|jpe?g|js|json|pdf|png|svg|webp|xml|zip)$/i.test(url.pathname)
    ) {
      return null
    }

    return url.href
  } catch {
    return null
  }
}

async function readPublicPage(url: string, origin: string): Promise<CrawledPage | null> {
  const response = await fetch(url, {
    headers: { Accept: 'text/html' },
    next: { revalidate: 300 },
    redirect: 'manual',
    signal: AbortSignal.timeout(5000),
  })
  if (
    !response.ok ||
    response.redirected ||
    new URL(response.url).origin !== origin ||
    !response.headers.get('content-type')?.includes('text/html')
  ) return null

  const $ = load(await response.text())
  const links = new Set<string>()
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href')
    if (!href) return
    const pageUrl = toPublicPageUrl(href, origin)
    if (pageUrl) links.add(pageUrl)
  })

  const main = $('main').first()
  const title = main.find('h1').first().text().trim() || $('title').first().text().trim()
  $('script, style, noscript, svg, header, nav, footer, form, button, iframe').remove()
  $('template, [hidden], [aria-hidden="true"], [class~="sr-only"], [class~="hidden"], [class~="invisible"], [class*="visually-hidden"]').remove()
  $('[style]').each((_, element) => {
    const inlineStyle = ($(element).attr('style') ?? '').replace(/\s+/g, '').toLowerCase()
    if (inlineStyle.includes('display:none') || inlineStyle.includes('visibility:hidden')) {
      $(element).remove()
    }
  })
  const text = (main.length ? main.text() : $('body').text()).replace(/\s+/g, ' ').trim()

  return { url, title, text, links: [...links] }
}

async function crawlPublicPages(origin: string) {
  const queue = [origin]
  const visited = new Set<string>()
  const crawledPages: CrawledPage[] = []
  let contextLength = 0

  while (queue.length > 0 && visited.size < MAX_PAGES && contextLength < MAX_CONTEXT_CHARS) {
    const batch: string[] = []
    while (queue.length > 0 && batch.length < CONCURRENT_PAGES && visited.size < MAX_PAGES) {
      const url = queue.shift()
      if (!url || visited.has(url)) continue
      visited.add(url)
      batch.push(url)
    }

    const batchResults = await Promise.all(
      batch.map((url) => readPublicPage(url, origin).catch(() => null)),
    )

    for (const page of batchResults) {
      if (!page) continue

      const pageText = page.text.slice(0, Math.min(MAX_PAGE_CHARS, MAX_CONTEXT_CHARS - contextLength))
      if (pageText) {
        crawledPages.push({ ...page, text: pageText })
        contextLength += pageText.length
      }

      for (const link of page.links) {
        if (!visited.has(link) && !queue.includes(link)) queue.push(link)
      }
    }
  }

  return crawledPages
}

function rankPage(page: CrawledPage, queryWords: string[]) {
  const path = new URL(page.url).pathname.toLowerCase()
  const title = page.title.toLowerCase()
  const text = page.text.toLowerCase()
  let score = 0

  for (const word of queryWords) {
    if (path.split('/').includes(word)) score += 10
    if (title.includes(word)) score += 5
    if (text.includes(word)) score += 1
  }

  if (path === '/' && queryWords.some((word) => word === 'home' || word === 'homepage')) {
    score += 12
  }

  return score
}

function selectRelevantPages(pages: CrawledPage[], query: string) {
  const queryWords = [...new Set(query.toLowerCase().match(/[a-z0-9]+/g) ?? [])].filter(
    (word) => word.length > 2 && !QUERY_STOP_WORDS.has(word),
  )
  const rankedPages = pages
    .map((page) => ({ page, score: rankPage(page, queryWords) }))
    .sort((first, second) => second.score - first.score)
    .slice(0, MAX_RETRIEVED_PAGES)

  let contextLength = 0
  const entries: string[] = []
  for (const { page } of rankedPages) {
    const entry = `Page path: ${new URL(page.url).pathname}\nExact main H1: ${page.title || '(not set)'}\nPage content: ${page.text}`
    const remainingChars = MAX_RETRIEVED_CHARS - contextLength
    if (remainingChars <= 0) break
    const excerpt = entry.slice(0, remainingChars)
    entries.push(excerpt)
    contextLength += excerpt.length
  }

  return entries.join('\n\n')
}

export async function getCgsWebsiteKnowledge(origin: string, query: string) {
  const normalizedOrigin = new URL(origin).origin
  let pages: CrawledPage[]
  if (cachedOrigin === normalizedOrigin && cachedUntil > Date.now()) {
    pages = cachedPages
  } else if (pendingCrawl?.origin === normalizedOrigin) {
    pages = await pendingCrawl.promise
  } else {
    const promise = crawlPublicPages(normalizedOrigin)
    pendingCrawl = { origin: normalizedOrigin, promise }

    try {
      pages = await promise
      cachedOrigin = normalizedOrigin
      cachedUntil = Date.now() + CACHE_TTL_MS
      cachedPages = pages
    } finally {
      if (pendingCrawl?.promise === promise) pendingCrawl = null
    }
  }

  return selectRelevantPages(pages, query)
}
