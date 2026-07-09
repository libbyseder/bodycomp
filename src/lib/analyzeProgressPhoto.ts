import { supabase } from './supabase'
import { apiUrl } from './apiBase'
import type { PhotoAnalysis } from '../types'

export interface AnalyzePhotoResult {
  ok: boolean
  analysis?: PhotoAnalysis
  error?: string
}

export async function analyzeProgressPhoto(photoId: string): Promise<AnalyzePhotoResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { ok: false, error: 'Please log in first' }
  }

  const response = await fetch(apiUrl('/api/photos/analyze'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ photoId }),
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok || !result.success) {
    return {
      ok: false,
      error: result.error || `Analysis failed (${response.status})`,
    }
  }

  return {
    ok: true,
    analysis: result.analysis as PhotoAnalysis,
  }
}