'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'

export type HeroCollageCard = {
  eyebrow: string
  title: string
  detail: string
}

type HeroCollageProps = {
  cards: readonly HeroCollageCard[]
  image: string
  imageAlt: string
}

const CARD_POSITIONS = [
  'left-0 top-[11%] w-[47%] sm:w-[43%]',
  'right-0 top-[31%] w-[44%] sm:w-[41%]',
  'bottom-0 left-[14%] w-[62%] sm:left-[28%] sm:w-[48%]',
]
const CARD_ROTATIONS = [-4, 4, -2]

export default function HeroCollage({ cards, image, imageAlt }: HeroCollageProps) {
  const reduceMotion = Boolean(useReducedMotion())

  return (
    <div className="relative mx-auto aspect-[1.14] w-full max-w-[640px]">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-[8%_8%_9%] overflow-hidden rounded-panel border border-line bg-surface shadow-panel"
      >
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          sizes="(min-width: 1024px) 48vw, 90vw"
          className="object-cover"
        />
        <div className="absolute inset-x-3 top-3 flex items-center justify-between rounded-lg border border-line bg-bg px-3 py-2 text-ink sm:inset-x-4 sm:top-4">
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            CGS field network
          </span>
          <span className="text-[10px] text-ink-muted">Active</span>
        </div>
      </motion.div>

      {cards.slice(0, 3).map((card, index) => {
        const rotation = CARD_ROTATIONS[index] ?? 0
        return (
          <motion.div
            key={`${card.eyebrow}-${card.title}`}
            aria-hidden="true"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12, rotate: rotation + 3 }}
            animate={
              reduceMotion
                ? { opacity: 1, y: 0, rotate: rotation }
                : { opacity: 1, y: [0, -5, 0], rotate: [rotation, rotation + 1, rotation] }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    opacity: { duration: 0.35, delay: index * 0.08 },
                    y: { duration: 5 + index, ease: 'easeInOut', repeat: Infinity, delay: index * 0.18 },
                    rotate: { duration: 5 + index, ease: 'easeInOut', repeat: Infinity, delay: index * 0.18 },
                  }
            }
            className={`absolute z-10 rounded-xl border border-line bg-surface p-3 shadow-none sm:p-4 ${CARD_POSITIONS[index] ?? ''}`}
          >
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted sm:text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" />
              {card.eyebrow}
            </p>
            <p className="mt-2 truncate font-display text-sm font-semibold text-ink sm:text-base">{card.title}</p>
            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-ink-muted sm:text-xs sm:leading-5">{card.detail}</p>
          </motion.div>
        )
      })}
    </div>
  )
}
