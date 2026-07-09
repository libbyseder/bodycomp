import type { ProgressPhoto } from '../types'
import { PHOTO_POSE_LABELS } from './progressPhotos'
import { parsePhotoAnalysis } from './photoAnalysis'

export interface PhotoDaySummary {
  date: string
  count: number
  poseLabels: string[]
}

function groupPhotosByDate(photos: ProgressPhoto[]): Map<string, ProgressPhoto[]> {
  const map = new Map<string, ProgressPhoto[]>()
  for (const photo of photos) {
    const existing = map.get(photo.date) ?? []
    existing.push(photo)
    map.set(photo.date, existing)
  }
  return map
}

export function photoDaysInLabels(
  photos: ProgressPhoto[],
  labels: string[]
): PhotoDaySummary[] {
  const byDate = groupPhotosByDate(photos)

  return labels
    .filter((date) => byDate.has(date))
    .map((date) => {
      const dayPhotos = byDate.get(date)!
      const poses = [...new Set(dayPhotos.map((photo) => photo.pose))]
      return {
        date,
        count: dayPhotos.length,
        poseLabels: poses.map((pose) => PHOTO_POSE_LABELS[pose]),
      }
    })
}

export function buildPhotoMarkerValues(
  labels: string[],
  photos: ProgressPhoto[],
  anchorValues: (number | null)[]
): (number | null)[] {
  const photoDates = new Set(photos.map((photo) => photo.date))
  return labels.map((date, index) =>
    photoDates.has(date) ? anchorValues[index] : null
  )
}

export function buildAiBodyFatSeries(
  labels: string[],
  photos: ProgressPhoto[]
): (number | null)[] {
  const byDate = groupPhotosByDate(photos)

  return labels.map((date) => {
    const dayPhotos = byDate.get(date)
    if (!dayPhotos) return null

    const analyzed = dayPhotos
      .map((photo) => ({
        photo,
        analysis: parsePhotoAnalysis(photo.analysis_json),
      }))
      .filter((entry) => entry.analysis?.body_fat_percent != null)

    if (analyzed.length === 0) return null

    const preferred =
      analyzed.find((entry) => entry.photo.pose === 'front') ?? analyzed[0]

    return preferred.analysis!.body_fat_percent
  })
}

export function analyzedPhotoCount(photos: ProgressPhoto[]): number {
  return photos.filter((photo) => {
    const analysis = parsePhotoAnalysis(photo.analysis_json)
    return analysis?.body_fat_percent != null
  }).length
}