import type { Measurement, Profile } from '../types'
import {
  calculateFFMI,
  calculateNormalizedFFMI,
  heightInchesToMeters,
  NORMALIZED_FFMI_REFERENCE_HEIGHT_M,
} from './calculateFFMI'
import { computeSimpleMovingAverage, getSmoothingWindow } from './movingAverage'

type GoalMetric = 'weight' | 'bodyFat' | 'ffmi' | 'normalizedFfmi'

export interface GoalPrediction {
  metric: GoalMetric
  label: string
  message: string
  onTrack: boolean
  days: number
}

interface TrendEstimate {
  days: number
  dailyRate: number
  smoothedLatest: number
  latestRaw: number
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T12:00:00`)
  const b = new Date(`${end}T12:00:00`)
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000))
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function addDaysFromToday(days: number): Date {
  const target = new Date()
  target.setDate(target.getDate() + days)
  return target
}

function normalizedFfmiOffset(heightInches: number): number {
  const heightMeters = heightInchesToMeters(heightInches)
  return 6.1 * (NORMALIZED_FFMI_REFERENCE_HEIGHT_M - heightMeters)
}

function estimateTrendToGoal(
  points: { date: string; value: number }[],
  goal: number,
  preferLower: boolean
): TrendEstimate | null {
  if (points.length < 3) return null

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const recent = sorted.slice(-14)
  const values = recent.map((p) => p.value)
  const window = getSmoothingWindow(values.length)
  const smoothed = computeSimpleMovingAverage(values, window)

  const latestIdx = smoothed.length - 1
  const latest = smoothed[latestIdx]
  const priorIdx = Math.max(0, latestIdx - Math.min(6, latestIdx))
  const prior = smoothed[priorIdx]

  if (latest == null || prior == null) return null

  const daySpan = daysBetween(recent[priorIdx].date, recent[latestIdx].date)
  const dailyRate = (latest - prior) / daySpan

  if (Math.abs(dailyRate) < 0.001) return null

  const atGoal = preferLower ? latest <= goal + 0.05 : latest >= goal - 0.05
  if (atGoal) {
    return {
      days: 0,
      dailyRate,
      smoothedLatest: latest,
      latestRaw: sorted[sorted.length - 1].value,
    }
  }

  const movingTowardGoal = preferLower ? dailyRate < 0 : dailyRate > 0
  if (!movingTowardGoal) return null

  const remaining = preferLower ? latest - goal : goal - latest
  return {
    days: Math.ceil(remaining / Math.abs(dailyRate)),
    dailyRate,
    smoothedLatest: latest,
    latestRaw: sorted[sorted.length - 1].value,
  }
}

function buildPrediction(
  metric: GoalMetric,
  label: string,
  days: number,
  onTrack: boolean
): GoalPrediction {
  return {
    metric,
    label,
    days,
    onTrack,
    message:
      days === 0
        ? `${label} goal reached at current trend`
        : `${label} goal around ${formatDate(addDaysFromToday(days))} at current trend`,
  }
}

function buildFfmiPoints(measurements: Measurement[], height: number) {
  return [...measurements]
    .filter((m) => m.body_fat != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({
      date: m.date,
      value: calculateFFMI(m.weight, m.body_fat, height) ?? 0,
    }))
    .filter((p) => p.value > 0)
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
    const losing = profile.target_weight < points[points.length - 1].value
    const trend = estimateTrendToGoal(points, profile.target_weight, losing)
    if (trend) {
      const atGoal = losing
        ? trend.latestRaw <= profile.target_weight + 0.5
        : trend.latestRaw >= profile.target_weight - 0.5
      predictions.push(
        buildPrediction('weight', 'Weight', trend.days, trend.days > 0 || atGoal)
      )
    }
  }

  if (profile.target_body_fat) {
    const points = sorted
      .filter((m) => m.body_fat != null)
      .map((m) => ({ date: m.date, value: m.body_fat! }))
    const trend = estimateTrendToGoal(points, profile.target_body_fat, true)
    if (trend) {
      predictions.push(
        buildPrediction(
          'bodyFat',
          'Body fat',
          trend.days,
          trend.days > 0 || trend.latestRaw <= profile.target_body_fat + 0.3
        )
      )
    }
  }

  if (height && (profile.target_ffmi || profile.target_normalized_ffmi)) {
    const ffmiPoints = buildFfmiPoints(sorted, height)
    const ffmiTrend =
      profile.target_ffmi != null
        ? estimateTrendToGoal(ffmiPoints, profile.target_ffmi, false)
        : null

    if (profile.target_ffmi != null && ffmiTrend) {
      predictions.push(
        buildPrediction(
          'ffmi',
          'FFMI',
          ffmiTrend.days,
          ffmiTrend.days > 0 || ffmiTrend.latestRaw >= profile.target_ffmi - 0.1
        )
      )
    }

    if (profile.target_normalized_ffmi != null && ffmiTrend) {
      const offset = normalizedFfmiOffset(height)
      const smoothedNormLatest = ffmiTrend.smoothedLatest + offset
      const latestNormRaw =
        (ffmiPoints[ffmiPoints.length - 1]?.value ?? 0) + offset
      const goal = profile.target_normalized_ffmi

      let normDays: number | null = null
      if (smoothedNormLatest >= goal - 0.05) {
        normDays = 0
      } else if (ffmiTrend.dailyRate > 0) {
        const remaining = goal - smoothedNormLatest
        normDays = Math.ceil(remaining / Math.abs(ffmiTrend.dailyRate))
      }

      if (normDays != null) {
        predictions.push(
          buildPrediction(
            'normalizedFfmi',
            'Normalized FFMI',
            normDays,
            normDays > 0 || latestNormRaw >= goal - 0.1
          )
        )
      }
    } else if (profile.target_normalized_ffmi != null && height) {
      const normPoints = sorted
        .filter((m) => m.body_fat != null)
        .map((m) => ({
          date: m.date,
          value: calculateNormalizedFFMI(m.weight, m.body_fat, height) ?? 0,
        }))
        .filter((p) => p.value > 0)
      const normTrend = estimateTrendToGoal(normPoints, profile.target_normalized_ffmi, false)
      if (normTrend) {
        predictions.push(
          buildPrediction(
            'normalizedFfmi',
            'Normalized FFMI',
            normTrend.days,
            normTrend.days > 0 || normTrend.latestRaw >= profile.target_normalized_ffmi - 0.1
          )
        )
      }
    }
  }

  return predictions.sort((a, b) => a.days - b.days)
}