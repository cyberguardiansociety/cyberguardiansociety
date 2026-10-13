import { capabilities } from '@/data/site'

export default function HeroTerminal() {
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface-2 shadow-panel">
      <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-mint" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
        </div>
        <p className="font-mono text-xs text-ink-muted">cgs / practice areas</p>
        <span className="text-[11px] font-medium text-mint">
          MEMBER-LED
        </span>
      </div>

      <div className="min-h-[300px] bg-bg px-4 py-6 sm:min-h-[340px] sm:px-6 sm:py-8">
        <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[28px_minmax(0,1fr)]">
          {capabilities.items.map((item, index) => (
            <div key={item.key} className="contents font-mono text-[12px] leading-7 sm:text-[13px]">
              <span className="select-none text-right text-ink-muted" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 break-words text-ink">{item.title}</span>
              <span aria-hidden="true" />
              <span className="min-w-0 break-words pb-3 text-ink-muted">{item.body}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2 px-4 py-3 text-[11px] text-ink-muted sm:px-5">
        <span>{capabilities.band.label}</span>
        <span className="font-mono">CGS / OVERVIEW</span>
      </div>
    </div>
  )
}