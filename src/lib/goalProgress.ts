export function progressTowardLowerGoal(current: number, goal: number): number {
  if (current <= goal) return 100
  if (current <= 0) return 0
  return Math.max(0, Math.min(100, (goal / current) * 100))
}

export function progressTowardHigherGoal(current: number, goal: number): number {
  if (current >= goal) return 100
  if (goal <= 0) return 0
  return Math.max(0, Math.min(100, (current / goal) * 100))
}

/** Journey start value when no explicit goal start date is set. */
export function metricBaselineForGoal(values: number[], goal: number, current: number): number {
  if (values.length === 0) return current
  if (goal < current) return Math.max(...values)
  if (goal > current) return Math.min(...values)
  return current
}

/** Baseline from the snapshot on goal start date, else peak/trough across the window. */
export function metricBaselineForGoalWindow(
  values: number[],
  goal: number,
  current: number,
  snapshotValue: number | null | undefined
): number {
  if (snapshotValue != null && Number.isFinite(snapshotValue)) {
    return snapshotValue
  }
  return metricBaselineForGoal(values, goal, current)
}

/** Journey-based progress from a starting baseline toward goal (gain or loss). */
export function progressFromBaseline(current: number, goal: number, baseline: number): number {
  if (Math.abs(current - goal) < 0.05) return 100
  if (Math.abs(baseline - goal) < 0.05) {
    return Math.abs(current - goal) < 0.05 ? 100 : 0
  }

  if (goal < baseline) {
    if (current <= goal) return 100
    if (current >= baseline) return 0
    return Math.max(0, Math.min(100, ((baseline - current) / (baseline - goal)) * 100))
  }

  if (current >= goal) return 100
  if (current <= baseline) return 0
  return Math.max(0, Math.min(100, ((current - baseline) / (goal - baseline)) * 100))
}