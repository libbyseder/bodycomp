import { supabase } from './supabase'
import { apiUrl } from './apiBase'

export interface WithingsSyncResult {
  ok: boolean
  message?: string
  error?: string
  found?: number
  newReadingsMerged?: number
  daysUpdated?: number
  measurementsSaved?: number
  skippedAlreadySynced?: number
  force?: boolean
}

export async function runWithingsSync(force = false): Promise<WithingsSyncResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { ok: false, error: 'Please log in first' }
  }

  const res = await fetch(apiUrl('/api/withings/sync'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ force }),
  })

  const result = await res.json().catch(() => ({}))

  if (!res.ok || result.success === false) {
    return {
      ok: false,
      error: result.details || result.error || `Sync failed (${res.status})`,
      found: result.found,
      newReadingsMerged: result.newReadingsMerged,
      daysUpdated: result.daysUpdated,
      measurementsSaved: result.measurementsSaved,
      skippedAlreadySynced: result.skippedAlreadySynced,
      force,
    }
  }

  return {
    ok: true,
    message: result.message,
    found: result.found,
    newReadingsMerged: result.newReadingsMerged,
    daysUpdated: result.daysUpdated,
    measurementsSaved: result.measurementsSaved,
    skippedAlreadySynced: result.skippedAlreadySynced,
    force,
  }
}