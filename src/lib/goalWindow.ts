import type { Measurement, Profile } from '../types'

export function getGoalStartDate(profile: Profile | null): string | null {
  const value = profile?.goal_start_date
  if (!value || typeof value !== 'string') return null
  return value
}

/**
 * Snap a selected goal start date to the nearest logged day.
 * Prefers the first log on or after the selected date; otherwise the latest log before it.
 */
export function resolveEffectiveGoalStartDate(
  measurements: Measurement[],
  selectedStartDate: string
): string | null {
  const uniqueDates = [...new Set(measurements.map((m) => m.date))].sort()
  if (uniqueDates.length === 0) return null

  const onOrAfter = uniqueDates.find((date) => date >= selectedStartDate)
  if (onOrAfter) return onOrAfter

  const before = uniqueDates.filter((date) => date < selectedStartDate)
  return before.length > 0 ? before[before.length - 1]! : null
}

export function getEffectiveGoalStartDate(
  measurements: Measurement[],
  profile: Profile | null
): string | null {
  const selected = getGoalStartDate(profile)
  if (!selected) return null
  return resolveEffectiveGoalStartDate(measurements, selected)
}

export function filterMeasurementsFromGoalStart(
  measurements: Measurement[],
  goalStartDate: string | null
): Measurement[] {
  if (!goalStartDate) return measurements
  return measurements.filter((m) => m.date >= goalStartDate)
}

/** Measurements used for goal progress (respects effective goal start date when set). */
export function measurementsForGoalProgress(
  measurements: Measurement[],
  profile: Profile | null
): Measurement[] {
  const selected = getGoalStartDate(profile)
  if (!selected) return measurements

  const effective = resolveEffectiveGoalStartDate(measurements, selected)
  const cutoff = effective ?? selected
  return filterMeasurementsFromGoalStart(measurements, cutoff)
}

/** Measurements shown in charts/log when hide toggle is on. */
export function measurementsForDisplay(
  measurements: Measurement[],
  profile: Profile | null
): Measurement[] {
  const selected = getGoalStartDate(profile)
  if (!selected || !profile?.hide_pre_goal_entries) return measurements

  const effective = resolveEffectiveGoalStartDate(measurements, selected)
  const cutoff = effective ?? selected
  return filterMeasurementsFromGoalStart(measurements, cutoff)
}

export function measurementOnDate(
  measurements: Measurement[],
  date: string
): Measurement | null {
  const onDate = measurements.filter((m) => m.date === date)
  if (onDate.length === 0) return null

  return onDate.reduce((latest, entry) => {
    const latestKey = latest.logged_at ?? latest.created_at
    const entryKey = entry.logged_at ?? entry.created_at
    return entryKey > latestKey ? entry : latest
  })
}

export function earliestMeasurement(measurements: Measurement[]): Measurement | null {
  if (measurements.length === 0) return null
  return measurements.reduce((earliest, entry) =>
    entry.date < earliest.date ? entry : earliest
  )
}

export function defaultGoalStartDate(measurements: Measurement[]): string | null {
  return earliestMeasurement(measurements)?.date ?? null
}

export function isHidingPreGoalEntries(profile: Profile | null): boolean {
  return !!getGoalStartDate(profile) && !!profile?.hide_pre_goal_entries
}

export function formatGoalDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function goalStartDateLabel(
  measurements: Measurement[],
  profile: Profile | null
): string | null {
  const selected = getGoalStartDate(profile)
  if (!selected) return null

  const effective = getEffectiveGoalStartDate(measurements, profile)
  if (!effective) {
    return `Goal progress starts ${formatGoalDate(selected)} (no entries yet on that date)`
  }

  if (effective === selected) {
    return `Goal progress counts from ${formatGoalDate(selected)}`
  }

  return `Goal progress counts from ${formatGoalDate(effective)} (nearest entry to ${formatGoalDate(selected)})`
}