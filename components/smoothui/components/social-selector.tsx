'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { socialIconMap, type SocialIconKey } from '@/components/ui/SocialIcons'

const ICON_SIZE = 36
const ICON_GAP = 16

export type SocialSelectorPlatform = {
  domain: string
  handle: string
  key: SocialIconKey
  name: string
  url: string
}

export type SocialSelectorProps = {
  className?: string
  onChange?: (platform: SocialSelectorPlatform) => void
  platforms: readonly SocialSelectorPlatform[]
  selectedPlatform?: SocialSelectorPlatform
}

export default function SocialSelector({
  platforms,
  selectedPlatform: controlledSelected,
  onChange,
  className = '',
}: SocialSelectorProps) {
  const reduceMotion = Boolean(useReducedMotion())
  const [internalSelected, setInternalSelected] = useState<SocialSelectorPlatform | null>(
    platforms[0] ?? null,
  )
  const selectedPlatform = controlledSelected ?? internalSelected

  if (!selectedPlatform) return null

  const selectedIndex = Math.max(
    0,
    platforms.findIndex((platform) => platform.url === selectedPlatform.url),
  )

  return (
    <div className={`my-4 w-full ${className}`}>
      <div role="group" aria-label="Official CGS social channels" className="relative flex w-fit items-center justify-start gap-[16px]">
        {platforms.map((platform) => {
          const Icon = socialIconMap[platform.key]
          const selected = platform.url === selectedPlatform.url
          return (
            <motion.button
              key={platform.key}
              type="button"
              aria-label={`Select ${platform.name}`}
              aria-pressed={selected}
              onClick={() => {
                if (onChange) onChange(platform)
                else setInternalSelected(platform)
              }}
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.2, duration: 0.3 }}
              className={`relative z-10 flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full p-2 shadow-none transition-colors hover:translate-y-0 hover:shadow-none active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${selected ? 'text-mint' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'}`}
            >
              <Icon size={20} />
              <span className="sr-only">{platform.name}</span>
            </motion.button>
          )
        })}
        <motion.div
          aria-hidden="true"
          initial={false}
          animate={{ x: selectedIndex * (ICON_SIZE + ICON_GAP) }}
          transition={reduceMotion ? { duration: 0 } : { damping: 30, duration: 0.25, stiffness: 500, type: 'spring' }}
          className="pointer-events-none absolute left-0 top-0 z-0 h-[36px] w-[36px] rounded-full border border-mint bg-bg"
        />
      </div>

      <motion.div
        key={selectedPlatform.url}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(5px)', y: 8 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, filter: 'blur(0px)', y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(5px)', y: -8 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.25 }}
        className="mt-4 text-sm text-ink-muted"
      >
        <p>
          Connect with CGS on{' '}
          <a href={selectedPlatform.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink hover:text-mint">
            {selectedPlatform.domain}
          </a>
        </p>
        <a href={selectedPlatform.url} target="_blank" rel="noopener noreferrer" className="font-medium text-mint hover:underline">
          {selectedPlatform.handle}
        </a>
      </motion.div>
    </div>
  )
}
