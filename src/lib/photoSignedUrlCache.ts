import { supabase } from './supabase'
import { createSignedPhotoUrl } from './progressPhotos'

const CACHE_TTL_MS = 50 * 60 * 1000

const cache = new Map<string, { url: string; expiresAt: number }>()

export function peekSignedPhotoUrl(storagePath: string): string | null {
  const entry = cache.get(storagePath)
  if (!entry || entry.expiresAt <= Date.now()) return null
  return entry.url
}

export async function fetchSignedPhotoUrl(storagePath: string): Promise<string | null> {
  const cached = peekSignedPhotoUrl(storagePath)
  if (cached) return cached

  const { url, error } = await createSignedPhotoUrl(supabase, storagePath)
  if (error || !url) return null

  cache.set(storagePath, { url, expiresAt: Date.now() + CACHE_TTL_MS })
  return url
}

export function clearSignedPhotoUrlCache() {
  cache.clear()
}