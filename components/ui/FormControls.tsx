import { useRef, useState } from 'react'
import { CheckCircle2, FileText, Trash2, Upload } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Combobox, { type ComboboxOption } from '@/components/smoothui/components/combobox'

type FieldProps = {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  onBlur?: () => void
  children: React.ReactNode
}

/** Label + control + inline error, used across the application form. */
export function Field({ label, htmlFor, required, error, hint, className = '', onBlur, children }: FieldProps) {
  return (
    <label className={`block text-sm ${className}`} htmlFor={htmlFor} onBlur={onBlur}>
      <span className="mb-1.5 block text-ink-muted">
        {label} {required ? <span className="text-mint">*</span> : null}
      </span>
      {children}
      {error ? (
        <span id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="mt-1.5 block text-xs text-error">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-ink-muted">{hint}</span>
      ) : null}
    </label>
  )
}

type SelectFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly string[] | readonly { value: string; label: string }[]
  placeholder: string
  id: string
  required?: boolean
  error?: string
  className?: string
  onBlur?: () => void
}

/** Native select styled to match the fields, with a custom chevron. */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  id,
  required,
  error,
  className = '',
  onBlur,
}: SelectFieldProps) {
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const normalizedOptions: ComboboxOption[] = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  )

  return (
    <div className={`block text-sm ${className}`} onBlur={onBlur}>
      <label id={labelId} htmlFor={id} className="mb-1.5 block text-ink-muted">
        {label} {required ? <span className="text-mint">*</span> : null}
      </label>
      <Combobox
        id={id}
        value={value}
        onValueChange={onChange}
        options={normalizedOptions}
        placeholder={placeholder}
        searchPlaceholder={`Search ${label.toLowerCase()}…`}
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        required={required}
        error={Boolean(error)}
      />
      {error ? <span id={errorId} className="mt-1.5 block text-xs text-error">{error}</span> : null}
    </div>
  )
}

type ChipOption = { value: string; label: string; emoji?: string }

type ChipGroupProps = {
  options: readonly ChipOption[]
  selected: readonly string[]
  onToggle: (value: string) => void
  columns?: string
}

/** Multi-select pill group — divisions, skills, cyber areas. */
export function ChipGroup({ options, selected, onToggle, columns = 'sm:grid-cols-2' }: ChipGroupProps) {
  return (
    <div className={`grid gap-2 ${columns}`}>
      {options.map((option) => {
        const active = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(option.value)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] transition-all duration-150 ${
              active
                ? 'border-mint bg-mint text-on-mint'
                : 'border-line bg-bg text-ink-muted hover:border-mint hover:text-ink'
            }`}
          >
            {option.emoji ? <span aria-hidden="true">{option.emoji}</span> : null}
            <span className="flex-1">{option.label}</span>
            {active ? <CheckCircle2 size={14} className="shrink-0" /> : null}
          </button>
        )
      })}
    </div>
  )
}

type RadioCardsProps = {
  name: string
  options: readonly ChipOption[]
  value: string
  onChange: (value: string) => void
  columns?: string
}

/** Single-select card group — primary division, skill level. */
export function RadioCards({ name, options, value, onChange, columns = 'sm:grid-cols-3' }: RadioCardsProps) {
  return (
    <div className={`grid gap-2 ${columns}`} role="radiogroup">
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            name={name}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] transition-all duration-150 ${
              active
                ? 'border-mint bg-mint text-on-mint'
                : 'border-line bg-bg text-ink-muted hover:border-mint hover:text-ink'
            }`}
          >
            {option.emoji ? <span aria-hidden="true">{option.emoji}</span> : null}
            <span className="flex-1">{option.label}</span>
            {active ? <CheckCircle2 size={14} className="shrink-0" /> : null}
          </button>
        )
      })}
    </div>
  )
}

type FileDropProps = {
  id: string
  label: string
  hint: string
  accept: string
  file: File | null
  onFile: (file: File | null) => void
  error?: string | null
  formatBytes: (bytes: number) => string
  disabled?: boolean
}

/** Drag-and-drop upload zone with a real file input behind it. */
export function FileDrop({
  id,
  label,
  hint,
  accept,
  file,
  onFile,
  error,
  formatBytes,
  disabled = false,
}: FileDropProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dragCounter = useRef(0)
  const [dragging, setDragging] = useState(false)
  const reduceMotion = useReducedMotion()
  const motionTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, bounce: 0.1, duration: 0.25 }

  const handleFiles = (files: FileList | null) => {
    onFile(files?.[0] ?? null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm text-ink-muted">{label}</span>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <AnimatePresence initial={false} mode="wait">
        {file ? (
          <motion.div
            key={`${file.name}-${file.size}-${file.lastModified}`}
            layout={!reduceMotion}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, x: -14 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, x: 14 }}
            transition={motionTransition}
            className="flex items-center gap-3 rounded-xl border border-mint bg-surface p-4"
          >
            <motion.span
              initial={reduceMotion ? false : { scale: 0.8, y: 4 }}
              animate={{ scale: 1, y: 0 }}
              transition={motionTransition}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-mint text-on-mint"
            >
              <FileText size={18} />
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-ink-muted">{formatBytes(file.size)} · ready to send</p>
            </div>
            <motion.button
              type="button"
              disabled={disabled}
              onClick={() => onFile(null)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:border-error hover:text-error"
              aria-label={`Remove ${file.name}`}
              whileHover={reduceMotion || disabled ? undefined : { scale: 1.08 }}
              whileTap={reduceMotion || disabled ? undefined : { scale: 0.9 }}
            >
              <Trash2 size={15} />
            </motion.button>
          </motion.div>
        ) : (
          <motion.button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault()
              if (disabled) return
              dragCounter.current += 1
              setDragging(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault()
              dragCounter.current = Math.max(0, dragCounter.current - 1)
              if (dragCounter.current === 0) setDragging(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              dragCounter.current = 0
              setDragging(false)
              if (!disabled) handleFiles(event.dataTransfer.files)
            }}
            animate={reduceMotion ? undefined : { scale: dragging ? 1.02 : 1 }}
            transition={motionTransition}
            className={`flex w-full items-center gap-3 rounded-xl border border-dashed p-5 text-left transition-colors duration-200 motion-reduce:transition-none ${
              dragging
                ? 'border-mint bg-bg'
                : 'border-line bg-bg hover:border-mint'
            }`}
            aria-label={`${label}: click to browse or drag and drop. ${hint}`}
          >
            <motion.span
              animate={reduceMotion ? undefined : dragging ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
              transition={motionTransition}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-mint text-on-mint"
            >
              <Upload size={18} />
            </motion.span>
            <span className="min-w-0 flex-1">
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={dragging ? 'drop' : 'idle'}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.15 }}
                  className="block text-sm font-medium"
                >
                  {dragging ? 'Drop your file here' : 'Click to upload or drag and drop'}
                </motion.span>
              </AnimatePresence>
              <span className="block text-xs text-ink-muted">{hint}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="file-error"
            role="alert"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={motionTransition}
            className="mt-1.5 text-xs text-error"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
