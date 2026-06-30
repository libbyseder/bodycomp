/** Normalize common CSV date formats to ISO YYYY-MM-DD for Postgres */
export function parseCsvDate(raw: string): string | null {
  const trimmed = raw.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    const [, month, day, year] = usMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }

  return null
}

/** Build a unique logged_at timestamp for each CSV row */
export function buildLoggedAt(isoDate: string, rawTime: string | undefined, rowIndex: number): string | null {
  if (rawTime?.trim()) {
    const time = rawTime.trim()
    const withSeconds = time.length === 5 ? `${time}:00` : time
    const parsed = new Date(`${isoDate}T${withSeconds}`)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  // UTC base + 1 minute per row guarantees uniqueness (avoids DST issues)
  const base = Date.parse(`${isoDate}T12:00:00.000Z`)
  if (isNaN(base)) return null
  return new Date(base + rowIndex * 60_000).toISOString()
}