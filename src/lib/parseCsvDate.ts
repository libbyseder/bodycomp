/** Strip BOM, quotes, and whitespace from CSV cell values */
export function cleanCsvCell(raw: string): string {
  return raw.trim().replace(/^\ufeff/, '').replace(/^"|"$/g, '').trim()
}

/** Normalize common CSV date formats to ISO YYYY-MM-DD for Postgres */
export function parseCsvDate(raw: string): string | null {
  const trimmed = cleanCsvCell(raw)

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // M/D/YYYY or MM/DD/YYYY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    const [, month, day, year] = usMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // M/D/YY
  const usShort = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (usShort) {
    const [, month, day, yy] = usShort
    const year = parseInt(yy, 10) < 50 ? `20${yy}` : `19${yy}`
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // YYYY/M/D
  const isoSlash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (isoSlash) {
    const [, year, month, day] = isoSlash
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Excel serial date number
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = parseFloat(trimmed)
    if (serial > 30000 && serial < 60000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30))
      const date = new Date(excelEpoch.getTime() + serial * 86400000)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }
  }

  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }

  return null
}

export function parseCsvWeight(raw: unknown): number {
  if (typeof raw === 'number') return raw
  const str = cleanCsvCell(String(raw)).replace(/,/g, '')
  return parseFloat(str)
}