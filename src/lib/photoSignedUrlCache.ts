import { supabase } from './supabase'
import { createSignedPhotoUrl } from './progressPhotos'

const CACHE_TTL_MS = 50 * 60 * 1000

const cache = new Map<string, { url: string; expiresAt: number }>()
const inFlight = new Map<string, Promise<string | null>>()

export function peekSignedPhotoUrl(storagePath: string): string | null {
  const entry = cache.get(storagePath)
  if (!entry || entry.expiresAt <= Date.now()) return null
  return entry.url
}

export async function fetchSignedPhotoUrl(storagePath: string): Promise<string | null> {
  const cached = peekSignedPhotoUrl(storagePath)
  if (cached) return cached

  const pending = inFlight.get(storagePath)
  if (pending) return pending

  const request = (async () => {
    const { url, error } = await createSignedPhotoUrl(supabase, storagePath)
    if (error || !url) return null

    cache.set(storagePath, { url, expiresAt: Date.now() + CACHE_TTL_MS })
    return url
  })()

  inFlight.set(storagePath, request)

  try {
    return await request
  } finally {
    inFlight.delete(storagePath)
  }
}

export function clearSignedPhotoUrlCache() {
  cache.clear()
  inFlight.clear()
}