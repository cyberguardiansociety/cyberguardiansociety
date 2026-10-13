export function utcToZonedLocalInput(value: string | Date | null | undefined, timeZone: string) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return ''

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    const hour = values.hour === '24' ? '00' : values.hour
    return `${values.year}-${values.month}-${values.day}T${hour}:${values.minute}`
  } catch {
    return ''
  }
}

export function parseZonedLocalInput(value: string | null | undefined, timeZone: string): Date | null {
  if (!value || typeof value !== 'string') return null
  const [datePart, timePart] = value.trim().replace(' ', 'T').split('T')
  if (!datePart || !timePart) return null

  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute)
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    let candidate = wallClockUtc
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const values = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]))
      const localHour = values.hour === '24' ? 0 : Number(values.hour)
      const renderedUtc = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        localHour,
        Number(values.minute),
        Number(values.second || 0),
      )
      const difference = renderedUtc - wallClockUtc
      if (difference === 0) break
      candidate -= difference
    }

    const result = new Date(candidate)
    return utcToZonedLocalInput(result, timeZone) === value ? result : null
  } catch {
    return null
  }
}
