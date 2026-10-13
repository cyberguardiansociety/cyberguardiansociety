'use client'

import { usePathname } from 'next/navigation'
import { footer } from '@/data/site'
import ClayButton from '@/components/ui/ClayButton'

const legalPaths = new Set(['/privacy', '/terms', '/code-of-conduct'])

export default function FooterBanner({ show }: { show: boolean }) {
  const pathname = usePathname()
  if (!show || legalPaths.has(pathname)) return null

  return (
    <div className="relative overflow-hidden border-b border-line bg-surface-2 px-6 py-8 sm:px-10 sm:py-9 lg:flex lg:items-center lg:justify-between lg:gap-10">
      <div className="relative max-w-xl">
        <h2 className="font-display text-[22px] font-semibold tracking-[-0.03em] sm:text-[26px]">
          {footer.joinBox.title}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{footer.joinBox.body}</p>
      </div>
      <div className="relative mt-6 flex flex-wrap gap-3 lg:mt-0">
        <ClayButton href={footer.joinBox.primary.href} variant="primary">
          {footer.joinBox.primary.label}
        </ClayButton>
        <ClayButton href={footer.joinBox.secondary.href} variant="secondary">
          {footer.joinBox.secondary.label}
        </ClayButton>
      </div>
    </div>
  )
}