import { useEffect, useMemo, useState } from 'react'
import type { ProgressPhoto } from '../types'
import { supabase } from '../lib/supabase'
import { createSignedPhotoUrl } from '../lib/progressPhotos'

export function usePhotoSignedUrls(photos: ProgressPhoto[]) {
  const [urlByPath, setUrlByPath] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const storagePaths = useMemo(
    () => [...new Set(photos.map((photo) => photo.storage_path))].sort(),
    [photos]
  )

  const pathsKey = storagePaths.join('|')

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (storagePaths.length === 0) {
        setUrlByPath({})
        setLoading(false)
        return
      }

      setLoading(true)
      const entries = await Promise.all(
        storagePaths.map(async (path) => {
          const { url } = await createSignedPhotoUrl(supabase, path)
          return [path, url] as const
        })
      )

      if (cancelled) return

      const next: Record<string, string> = {}
      for (const [path, url] of entries) {
        if (url) next[path] = url
      }
      setUrlByPath(next)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [pathsKey, storagePaths])

  const getUrl = (storagePath: string) => urlByPath[storagePath] ?? null

  return { getUrl, loading }
}