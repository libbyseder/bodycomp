export interface DailyAggregate {
  weight: number
  body_fat: number | null
  log_count: number
  body_fat_log_count: number
}

function round1(n: number): number {
  return parseFloat(n.toFixed(1))
}

/** Merge two daily aggregates (e.g. existing DB row + new CSV batch for same date) */
export function mergeAggregates(
  existing: DailyAggregate | null,
  incoming: DailyAggregate
): DailyAggregate {
  if (!existing) {
    return {
      weight: round1(incoming.weight),
      body_fat: incoming.body_fat !== null ? round1(incoming.body_fat) : null,
      log_count: incoming.log_count,
      body_fat_log_count: incoming.body_fat_log_count,
    }
  }

  const log_count = existing.log_count + incoming.log_count
  const weight = round1(
    (existing.weight * existing.log_count + incoming.weight * incoming.log_count) / log_count
  )

  const body_fat_log_count = existing.body_fat_log_count + incoming.body_fat_log_count
  let body_fat: number | null = null

  if (body_fat_log_count > 0) {
    const existingSum = (existing.body_fat ?? 0) * existing.body_fat_log_count
    const incomingSum = (incoming.body_fat ?? 0) * incoming.body_fat_log_count
    body_fat = round1((existingSum + incomingSum) / body_fat_log_count)
  }

  return { weight, body_fat, log_count, body_fat_log_count }
}

/** Convert a single new reading into a 1-log aggregate */
export function readingToAggregate(reading: {
  weight: number
  body_fat: number | null
}): DailyAggregate {
  const hasBf = reading.body_fat !== null
  return {
    weight: reading.weight,
    body_fat: reading.body_fat,
    log_count: 1,
    body_fat_log_count: hasBf ? 1 : 0,
  }
}

export function rowToAggregate(row: {
  weight: number
  body_fat: number | null
  log_count?: number | null
  body_fat_log_count?: number | null
}): DailyAggregate {
  const log_count = row.log_count ?? 1
  const body_fat_log_count =
    row.body_fat_log_count ?? (row.body_fat !== null ? log_count : 0)

  return {
    weight: row.weight,
    body_fat: row.body_fat,
    log_count,
    body_fat_log_count,
  }
}