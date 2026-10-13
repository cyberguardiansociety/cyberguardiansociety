'use client'

import { useState, useEffect } from 'react'
import Combobox, { type ComboboxOption } from '@/components/smoothui/components/combobox'

export type AdminComboboxOption = string | ComboboxOption

type AdminComboboxProps = {
  name?: string
  label?: string
  value?: string
  defaultValue?: string
  options: readonly (string | ComboboxOption)[]
  placeholder?: string
  searchPlaceholder?: string
  required?: boolean
  className?: string
  id?: string
  onChange?: (val: string) => void
}

export default function AdminCombobox({
  name,
  label,
  value: controlledValue,
  defaultValue = '',
  options,
  placeholder = 'Select option…',
  searchPlaceholder = 'Search…',
  required = false,
  className = '',
  id,
  onChange,
}: AdminComboboxProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || (controlledValue ?? ''))
  const inputId = id || (name ? `combobox-${name}` : `combobox-${Math.random().toString(36).slice(2, 7)}`)

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue)
    }
  }, [controlledValue])

  const activeValue = controlledValue !== undefined ? controlledValue : internalValue

  const normalizedOptions: ComboboxOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  )

  const handleValueChange = (newVal: string) => {
    setInternalValue(newVal)
    onChange?.(newVal)
  }

  return (
    <div className={`admin-combobox-wrapper ${className}`}>
      {label && (
        <label htmlFor={inputId} className="cms-form-label">
          <span>{label}</span>
          {required && <strong className="cms-required">*</strong>}
        </label>
      )}

      {/* Hidden input to pass value in form submissions when name is provided */}
      {name && <input type="hidden" name={name} value={activeValue} />}

      <Combobox
        id={inputId}
        value={activeValue}
        onValueChange={handleValueChange}
        options={normalizedOptions}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        required={required}
      />
    </div>
  )
}
