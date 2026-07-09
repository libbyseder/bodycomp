import type { PhotoAnalysis } from '../types'

export function parsePhotoAnalysis(value: unknown): PhotoAnalysis | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const confidence = String(raw.confidence ?? '').toLowerCase()
  if (confidence !== 'low' && confidence !== 'medium' && confidence !== 'high') {
    return null
  }
  if (typeof raw.summary !== 'string' || !raw.summary.trim()) return null

  return {
    body_fat_percent:
      typeof raw.body_fat_percent === 'number' ? raw.body_fat_percent : null,
    body_fat_range_low:
      typeof raw.body_fat_range_low === 'number' ? raw.body_fat_range_low : null,
    body_fat_range_high:
      typeof raw.body_fat_range_high === 'number' ? raw.body_fat_range_high : null,
    confidence,
    summary: raw.summary,
    posture_notes: typeof raw.posture_notes === 'string' ? raw.posture_notes : null,
    muscle_observations:
      typeof raw.muscle_observations === 'string' ? raw.muscle_observations : null,
    analyzed_at: typeof raw.analyzed_at === 'string' ? raw.analyzed_at : '',
    model: typeof raw.model === 'string' ? raw.model : 'unknown',
    disclaimer:
      typeof raw.disclaimer === 'string'
        ? raw.disclaimer
        : 'Visual estimate only — not medical advice.',
  }
}

export function formatBodyFatEstimate(analysis: PhotoAnalysis): string | null {
  if (analysis.body_fat_percent == null) return null

  const point = `${analysis.body_fat_percent.toFixed(1)}%`
  if (
    analysis.body_fat_range_low != null &&
    analysis.body_fat_range_high != null &&
    analysis.body_fat_range_low !== analysis.body_fat_range_high
  ) {
    return `${point} (${analysis.body_fat_range_low.toFixed(1)}–${analysis.body_fat_range_high.toFixed(1)}%)`
  }
  return point
}

export function confidenceLabel(confidence: PhotoAnalysis['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'High confidence'
    case 'medium':
      return 'Medium confidence'
    default:
      return 'Low confidence'
  }
}