import type { Measurement, ProgressPhoto, ProgressPhotoPose } from '../types'
import {
  calculateFFMI,
  calculateLeanMassLbs,
  calculateNormalizedFFMI,
} from './calculateFFMI'
import { parsePhotoAnalysis } from './photoAnalysis'

const POSE_PRIORITY: ProgressPhotoPose[] = ['front', 'side', 'back', 'other']

export function photosForPose(
  photos: ProgressPhoto[],
  pose: ProgressPhotoPose
): ProgressPhoto[] {
  return photos
    .filter((photo) => photo.pose === pose)
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
}

export function posesWithMultiplePhotos(photos: ProgressPhoto[]): ProgressPhotoPose[] {
  return POSE_PRIORITY.filter((pose) => compareDatesForPose(photos, pose).length >= 2)
}

export function defaultComparePose(photos: ProgressPhoto[]): ProgressPhotoPose | null {
  return posesWithMultiplePhotos(photos)[0] ?? null
}

export function compareDatesForPose(
  photos: ProgressPhoto[],
  pose: ProgressPhotoPose
): string[] {
  return [...new Set(photosForPose(photos, pose).map((photo) => photo.date))].sort()
}

export function photoOnDate(
  photos: ProgressPhoto[],
  pose: ProgressPhotoPose,
  date: string
): ProgressPhoto | null {
  const matches = photosForPose(photos, pose).filter((photo) => photo.date === date)
  return matches[matches.length - 1] ?? null
}

export interface ComparePair {
  before: ProgressPhoto
  after: ProgressPhoto
}

export function resolveComparePair(
  photos: ProgressPhoto[],
  pose: ProgressPhotoPose,
  beforeDate: string,
  afterDate: string
): ComparePair | null {
  if (!beforeDate || !afterDate || beforeDate >= afterDate) return null

  const before = photoOnDate(photos, pose, beforeDate)
  const after = photoOnDate(photos, pose, afterDate)
  if (!before || !after) return null

  return { before, after }
}

export function defaultCompareDates(
  photos: ProgressPhoto[],
  pose: ProgressPhotoPose
): { beforeDate: string; afterDate: string } | null {
  const dates = compareDatesForPose(photos, pose)
  if (dates.length < 2) return null
  return { beforeDate: dates[0], afterDate: dates[dates.length - 1] }
}

export function daysBetweenDates(before: string, after: string): number {
  const start = new Date(`${before}T12:00:00`).getTime()
  const end = new Date(`${after}T12:00:00`).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return 0
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)))
}

export interface CompareMetricDelta {
  label: string
  before: string
  after: string
  delta: string | null
}

function formatDelta(value: number, unit: string, digits = 1): string {
  const rounded = parseFloat(value.toFixed(digits))
  const prefix = rounded > 0 ? '+' : ''
  return `${prefix}${rounded}${unit}`
}

function formatValue(value: number | null | undefined, formatter: (n: number) => string): string {
  return value == null ? '—' : formatter(value)
}

function pushNumericMetric(
  metrics: CompareMetricDelta[],
  label: string,
  beforeValue: number | null | undefined,
  afterValue: number | null | undefined,
  formatNumber: (n: number) => string,
  unit: string,
  digits = 1
) {
  if (beforeValue == null && afterValue == null) return

  const delta =
    beforeValue != null && afterValue != null
      ? formatDelta(afterValue - beforeValue, unit, digits)
      : null

  metrics.push({
    label,
    before: formatValue(beforeValue, formatNumber),
    after: formatValue(afterValue, formatNumber),
    delta,
  })
}

export function compareMetricDeltas(
  beforeMeasurement: Measurement | null | undefined,
  afterMeasurement: Measurement | null | undefined,
  beforePhoto: ProgressPhoto,
  afterPhoto: ProgressPhoto,
  heightInches: number | null | undefined
): CompareMetricDelta[] {
  const metrics: CompareMetricDelta[] = []

  pushNumericMetric(
    metrics,
    'Weight (scale)',
    beforeMeasurement?.weight,
    afterMeasurement?.weight,
    (value) => `${value} lbs`,
    ' lbs',
    1
  )

  pushNumericMetric(
    metrics,
    'Body fat (scale)',
    beforeMeasurement?.body_fat,
    afterMeasurement?.body_fat,
    (value) => `${value}%`,
    '%',
    1
  )

  const beforeLean = beforeMeasurement
    ? calculateLeanMassLbs(beforeMeasurement.weight, beforeMeasurement.body_fat)
    : null
  const afterLean = afterMeasurement
    ? calculateLeanMassLbs(afterMeasurement.weight, afterMeasurement.body_fat)
    : null

  pushNumericMetric(
    metrics,
    'Lean mass (est.)',
    beforeLean,
    afterLean,
    (value) => `${value} lbs`,
    ' lbs',
    1
  )

  if (heightInches != null && heightInches > 0) {
    const beforeFfmi =
      beforeMeasurement != null
        ? calculateFFMI(
            beforeMeasurement.weight,
            beforeMeasurement.body_fat,
            heightInches
          )
        : null
    const afterFfmi =
      afterMeasurement != null
        ? calculateFFMI(afterMeasurement.weight, afterMeasurement.body_fat, heightInches)
        : null

    pushNumericMetric(metrics, 'FFMI', beforeFfmi, afterFfmi, (value) => `${value}`, '', 2)

    const beforeNormFfmi =
      beforeMeasurement != null
        ? calculateNormalizedFFMI(
            beforeMeasurement.weight,
            beforeMeasurement.body_fat,
            heightInches
          )
        : null
    const afterNormFfmi =
      afterMeasurement != null
        ? calculateNormalizedFFMI(
            afterMeasurement.weight,
            afterMeasurement.body_fat,
            heightInches
          )
        : null

    pushNumericMetric(
      metrics,
      'Norm. FFMI',
      beforeNormFfmi,
      afterNormFfmi,
      (value) => `${value}`,
      '',
      2
    )
  }

  const beforeAi = parsePhotoAnalysis(beforePhoto.analysis_json)
  const afterAi = parsePhotoAnalysis(afterPhoto.analysis_json)

  pushNumericMetric(
    metrics,
    'Body fat (AI est.)',
    beforeAi?.body_fat_percent,
    afterAi?.body_fat_percent,
    (value) => `${value.toFixed(1)}%`,
    '%',
    1
  )

  return metrics
}

export function formatMeasurementSummary(
  measurement: Measurement | null | undefined,
  heightInches: number | null | undefined
): string | null {
  if (!measurement) return null

  const parts = [`${measurement.weight} lbs`]
  if (measurement.body_fat != null) {
    parts.push(`${measurement.body_fat}% BF`)
  }

  if (heightInches != null && heightInches > 0 && measurement.body_fat != null) {
    const ffmi = calculateFFMI(measurement.weight, measurement.body_fat, heightInches)
    const normFfmi = calculateNormalizedFFMI(
      measurement.weight,
      measurement.body_fat,
      heightInches
    )
    if (ffmi != null) parts.push(`FFMI ${ffmi}`)
    if (normFfmi != null) parts.push(`Norm ${normFfmi}`)
  }

  const lean = calculateLeanMassLbs(measurement.weight, measurement.body_fat)
  if (lean != null) parts.push(`Lean ${lean} lbs`)

  return parts.join(' · ')
}