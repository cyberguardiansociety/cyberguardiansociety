'use client'

import { useEffect, useState, useRef } from 'react'

interface AutoCounterProps {
  end: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
}

export default function AutoCounter({
  end,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 2000,
}: AutoCounterProps) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return
    // Visitors who ask for less motion get the final figure immediately.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(end)
      return
    }

    let startTime: number | null = null
    let animationFrame: number

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentVal = easeProgress * end

      setCount(currentVal)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step)
      } else {
        setCount(end)
      }
    }

    animationFrame = requestAnimationFrame(step)

    return () => cancelAnimationFrame(animationFrame)
  }, [isVisible, end, duration])

  const formatted =
    decimals > 0
      ? count.toFixed(decimals)
      : Math.floor(count).toLocaleString()

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
