export function progressTowardWeightGoal(current: number, goal: number): number {
  if (goal <= 0 || current <= 0) return 0
  if (Math.abs(current - goal) < 0.05) return 100

  if (goal > current) {
    return Math.max(0, Math.min(100, (current / goal) * 100))
  }

  return Math.max(0, Math.min(100, (goal / current) * 100))
}

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

/** Progress from a starting baseline toward a higher goal (journey-based). */
export function progressFromBaseline(current: number, goal: number, baseline: number): number {
  if (goal <= baseline) {
    return current >= goal ? 100 : 0
  }
  if (current >= goal) return 100
  if (current <= baseline) return 0
  return Math.max(0, Math.min(100, ((current - baseline) / (goal - baseline)) * 100))
}