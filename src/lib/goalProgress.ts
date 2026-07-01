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