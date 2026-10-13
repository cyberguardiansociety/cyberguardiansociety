'use client'

import { cn } from '@/lib/utils'
import SmoothButton from '@/components/smoothui/components/smooth-button'
import { CheckIcon, ChevronsUpDownIcon, LoaderIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type ComboboxOption = {
  disabled?: boolean
  label: string
  value: string
}

export type ComboboxProps = {
  'aria-describedby'?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  className?: string
  contentClassName?: string
  disabled?: boolean
  emptyText?: string
  error?: boolean
  id: string
  onSearch?: (query: string) => Promise<ComboboxOption[]>
  onValueChange?: (value: string) => void
  options?: readonly ComboboxOption[]
  placeholder?: string
  required?: boolean
  searchDebounce?: number
  searchPlaceholder?: string
  value: string
}

const MotionCommandItem = motion.create(CommandItem)
const SPRING_DEFAULT = { bounce: 0.1, duration: 0.25, type: 'spring' as const }
const DURATION_INSTANT = { duration: 0 }

export default function Combobox({
  id,
  value,
  onValueChange,
  options: staticOptions,
  onSearch,
  searchDebounce = 300,
  placeholder = 'Select an option…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results found.',
  disabled = false,
  required = false,
  error = false,
  className,
  contentClassName,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: ComboboxProps) {
  const reduceMotion = Boolean(useReducedMotion())
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [asyncOptions, setAsyncOptions] = useState<ComboboxOption[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)
  const hasLoadedRef = useRef(false)

  const displayOptions = onSearch ? asyncOptions : (staticOptions ?? [])
  const selectedLabel = displayOptions.find((option) => option.value === value)?.label

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
    if (!onSearch) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    const requestId = ++requestIdRef.current
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await onSearch(searchQuery)
        if (requestId === requestIdRef.current) setAsyncOptions(results)
      } catch {
        if (requestId === requestIdRef.current) setAsyncOptions([])
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    }, searchDebounce)
  }, [onSearch, searchDebounce])

  useEffect(() => {
    if (!open || !onSearch || hasLoadedRef.current) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    onSearch('')
      .then((results) => {
        if (requestId === requestIdRef.current) {
          setAsyncOptions(results)
          hasLoadedRef.current = true
        }
      })
      .catch(() => {
        if (requestId === requestIdRef.current) {
          setAsyncOptions([])
          hasLoadedRef.current = true
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false)
      })
  }, [open, onSearch])

  useEffect(() => () => {
    requestIdRef.current += 1
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setQuery('')
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }

  const handleSelect = (selectedValue: string) => {
    onValueChange?.(selectedValue === value ? '' : selectedValue)
    setQuery('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <SmoothButton
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          aria-required={required || undefined}
          aria-invalid={error || undefined}
          disabled={disabled}
          variant="outline"
          className={cn(
            'h-12 w-full justify-between rounded-xl border-line bg-surface-2 px-3.5 py-2.5 text-left font-medium text-ink shadow-none hover:translate-y-0 hover:scale-100 hover:shadow-none',
            !selectedLabel && 'text-ink-muted',
            error && 'border-error',
            reduceMotion && 'transition-none! duration-0!',
            className,
          )}
        >
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 text-ink-muted opacity-60" />
        </SmoothButton>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          'w-(--radix-popover-trigger-width) p-0',
          reduceMotion && 'animate-none! transition-none! duration-0!',
          contentClassName,
        )}
      >
        <Command shouldFilter={!onSearch}>
          <CommandInput
            aria-label={searchPlaceholder}
            onValueChange={handleSearch}
            placeholder={searchPlaceholder}
            value={query}
          />
          <CommandList>
            <AnimatePresence initial={false}>
              {loading ? (
                <motion.div
                  key="loading"
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? { opacity: 0, transition: DURATION_INSTANT } : { opacity: 0 }}
                  transition={reduceMotion ? DURATION_INSTANT : SPRING_DEFAULT}
                  className="flex items-center justify-center py-4"
                >
                  <LoaderIcon className="size-4 animate-spin text-ink-muted motion-reduce:animate-none" />
                  <span className="ml-2 text-sm text-ink-muted">Loading…</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {!loading ? <CommandEmpty>{emptyText}</CommandEmpty> : null}
            {!loading && displayOptions.length > 0 ? (
              <CommandGroup>
                <AnimatePresence initial={false}>
                  {displayOptions.map((option, index) => (
                    <MotionCommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label]}
                      disabled={option.disabled}
                      onSelect={handleSelect}
                      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={
                        reduceMotion
                          ? DURATION_INSTANT
                          : { ...SPRING_DEFAULT, delay: Math.min(index, 10) * 0.02 }
                      }
                    >
                      <CheckIcon
                        className={cn(
                          'mr-2 size-4 shrink-0 text-mint',
                          value === option.value ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {option.label}
                    </MotionCommandItem>
                  ))}
                </AnimatePresence>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
