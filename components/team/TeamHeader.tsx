import { teamPage } from '@/data/site'

export default function TeamHeader() {
  const t = teamPage
  const accentAt = t.headline.indexOf(t.headlineAccent)

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" />
          <span className="text-xs font-semibold uppercase tracking-widest text-mint">
            {t.eyebrow}
          </span>
        </div>
        <h1 className="mb-6 font-display text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
          {accentAt > -1 ? (
            <>
              {t.headline.slice(0, accentAt)}
              <span className="bg-gradient-to-r from-mint to-mint-dim bg-clip-text text-transparent">
                {t.headlineAccent}
              </span>
              {t.headline.slice(accentAt + t.headlineAccent.length)}
            </>
          ) : (
            t.headline
          )}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-ink-muted sm:text-xl">
          {t.body}
        </p>
      </div>
    </section>
  )
}
