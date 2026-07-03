import type { Measurement, Profile } from '../types'
import { calculateFFMI, calculateNormalizedFFMI } from './calculateFFMI'
import { computeSimpleMovingAverage, getSmoothingWindow } from './movingAverage'

type GoalMetric = 'weight' | 'bodyFat' | 'ffmi' | 'normalizedFfmi'

interface GoalPrediction {
  metric: GoalMetric
  label: string
  message: string
  onTrack: boolean
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T12:00:00`)
  const b = new Date(`${end}T12:00:00`)
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000))
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function estimateDaysToGoal(
  points: { date: string; value: number }[],
  goal: number,
  preferLower: boolean
): number | null {
  if (points.length < 3) return null

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const recent = sorted.slice(-14)
  const values = recent.map((p) => p.value)
  const window = getSmoothingWindow(values.length)
  const smoothed = computeSimpleMovingAverage(values, window)

  const latestIdx = smoothed.length - 1
  const latest = smoothed[latestIdx]
  const prior = smoothed[Math.max(0, latestIdx - Math.min(6, latestIdx))]

  if (latest == null || prior == null) return null

  const daySpan = daysBetween(recent[Math.max(0, latestIdx - Math.min(6, latestIdx))].date, recent[latestIdx].date)
  const dailyRate = (latest - prior) / daySpan

  if (Math.abs(dailyRate) < 0.001) return null

  const atGoal =
    preferLower ? latest <= goal + 0.05 : latest >= goal - 0.05

  if (atGoal) return 0

  const movingTowardGoal = preferLower ? dailyRate < 0 : dailyRate > 0
  if (!movingTowardGoal) return null

  const remaining = preferLower ? latest - goal : goal - latest
  return Math.ceil(remaining / Math.abs(dailyRate))
}

export function getGoalPredictions(
  measurements: Measurement[],
  profile: Profile | null
): GoalPrediction[] {
  if (measurements.length < 3 || !profile) return []

  const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date))
  const height = profile.height_inches ?? sorted[sorted.length - 1].height_inches

  const predictions: GoalPrediction[] = []

  if (profile.target_weight) {
    const points = sorted.map((m) => ({ date: m.date, value: m.weight }))
    const current = points[points.length - 1].value
    const losing = profile.target_weight < current
    const days = estimateDaysToGoal(points, profile.target_weight, losing)
    if (days != null) {
      const target = new Date()
      target.setDate(target.getDate() + days)
      const atGoal = losing
        ? current <= profile.target_weight + 0.5
        : current >= profile.target_weight - 0.5
      predictions.push({
        metric: 'weight',
        label: 'Weight',
        onTrack: days > 0 || atGoal,
        message:
          days === 0
            ? 'Weight goal reached at current trend'
            : `Weight goal around ${formatDate(target)} at current trend`,
      })
    }
  }

  if (profile.target_body_fat) {
    const points = sorted
      .filter((m) => m.body_fat != null)
      .map((m) => ({ date: m.date, value: m.body_fat! }))
    const days = estimateDaysToGoal(points, profile.target_body_fat, true)
    if (days != null) {
      const target = new Date()
      target.setDate(target.getDate() + days)
      predictions.push({
        metric: 'bodyFat',
        label: 'Body Fat',
        onTrack: days > 0 || (points[points.length - 1]?.value ?? 100) <= profile.target_body_fat + 0.3,
        message:
          days === 0
            ? 'Body fat goal reached at current trend'
            : `Body fat goal around ${formatDate(target)} at current trend`,
      })
    }
  }

  if (profile.target_ffmi && height) {
    const points = sorted
      .filter((m) => m.body_fat != null)
      .map((m) => ({
        date: m.date,
        value: calculateFFMI(m.weight, m.body_fat, height) ?? 0,
      }))
      .filter((p) => p.value > 0)
    const days = estimateDaysToGoal(points, profile.target_ffmi, false)
    if (days != null) {
      const target = new Date()
      target.setDate(target.getDate() + days)
      predictions.push({
        metric: 'ffmi',
        label: 'FFMI',
        onTrack: days > 0 || (points[points.length - 1]?.value ?? 0) >= profile.target_ffmi - 0.1,
        message:
          days === 0
            ? 'FFMI goal reached at current trend'
            : `FFMI goal around ${formatDate(target)} at current trend`,
      })
    }
  }

  if (profile.target_normalized_ffmi && height) {
    const points = sorted
      .filter((m) => m.body_fat != null)
      .map((m) => ({
        date: m.date,
        value: calculateNormalizedFFMI(m.weight, m.body_fat, height) ?? 0,
      }))
      .filter((p) => p.value > 0)
    const days = estimateDaysToGoal(points, profile.target_normalized_ffmi, false)
    if (days != null) {
      const target = new Date()
      target.setDate(target.getDate() + days)
      predictions.push({
        metric: 'normalizedFfmi',
        label: 'Normalized FFMI',
        onTrack:
          days > 0 ||
          (points[points.length - 1]?.value ?? 0) >= profile.target_normalized_ffmi - 0.1,
        message:
          days === 0
            ? 'Normalized FFMI goal reached at current trend'
            : `Normalized FFMI goal around ${formatDate(target)} at current trend`,
      })
    }
  }

  return predictions
}