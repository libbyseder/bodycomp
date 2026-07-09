import type { Measurement, Profile } from '../types'

export function getGoalStartDate(profile: Profile | null): string | null {
  const value = profile?.goal_start_date
  if (!value || typeof value !== 'string') return null
  return value
}

export function filterMeasurementsFromGoalStart(
  measurements: Measurement[],
  goalStartDate: string | null
): Measurement[] {
  if (!goalStartDate) return measurements
  return measurements.filter((m) => m.date >= goalStartDate)
}

/** Measurements used for goal progress (respects goal start date when set). */
export function measurementsForGoalProgress(
  measurements: Measurement[],
  profile: Profile | null
): Measurement[] {
  return filterMeasurementsFromGoalStart(measurements, getGoalStartDate(profile))
}

/** Measurements shown in charts/log when hide toggle is on. */
export function measurementsForDisplay(
  measurements: Measurement[],
  profile: Profile | null
): Measurement[] {
  const goalStartDate = getGoalStartDate(profile)
  if (!goalStartDate || !profile?.hide_pre_goal_entries) return measurements
  return filterMeasurementsFromGoalStart(measurements, goalStartDate)
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