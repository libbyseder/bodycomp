import type { Measurement, ProgressPhoto, ProgressPhotoPose } from '../types'
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
  return POSE_PRIORITY.filter((pose) => photosForPose(photos, pose).length >= 2)
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

export function compareMetricDeltas(
  beforeMeasurement: Measurement | undefined,
  afterMeasurement: Measurement | undefined,
  beforePhoto: ProgressPhoto,
  afterPhoto: ProgressPhoto
): CompareMetricDelta[] {
  const metrics: CompareMetricDelta[] = []

  if (beforeMeasurement?.weight != null && afterMeasurement?.weight != null) {
    const delta = afterMeasurement.weight - beforeMeasurement.weight
    metrics.push({
      label: 'Weight (scale)',
      before: `${beforeMeasurement.weight} lbs`,
      after: `${afterMeasurement.weight} lbs`,
      delta: formatDelta(delta, ' lbs', 1),
    })
  }

  if (beforeMeasurement?.body_fat != null && afterMeasurement?.body_fat != null) {
    const delta = afterMeasurement.body_fat - beforeMeasurement.body_fat
    metrics.push({
      label: 'Body fat (scale)',
      before: `${beforeMeasurement.body_fat}%`,
      after: `${afterMeasurement.body_fat}%`,
      delta: formatDelta(delta, '%', 1),
    })
  }

  const beforeAi = parsePhotoAnalysis(beforePhoto.analysis_json)
  const afterAi = parsePhotoAnalysis(afterPhoto.analysis_json)

  if (beforeAi?.body_fat_percent != null && afterAi?.body_fat_percent != null) {
    const delta = afterAi.body_fat_percent - beforeAi.body_fat_percent
    metrics.push({
      label: 'Body fat (AI est.)',
      before: `${beforeAi.body_fat_percent.toFixed(1)}%`,
      after: `${afterAi.body_fat_percent.toFixed(1)}%`,
      delta: formatDelta(delta, '%', 1),
    })
  }

  return metrics
}