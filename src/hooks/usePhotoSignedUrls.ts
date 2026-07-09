import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProgressPhoto } from '../types'
import { supabase } from '../lib/supabase'
import { createSignedPhotoUrl } from '../lib/progressPhotos'

export function usePhotoSignedUrls(photos: ProgressPhoto[]) {
  const [urlByPath, setUrlByPath] = useState<Record<string, string>>({})
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set())
  const urlByPathRef = useRef(urlByPath)

  useEffect(() => {
    urlByPathRef.current = urlByPath
  }, [urlByPath])

  const storagePaths = useMemo(
    () => [...new Set(photos.map((photo) => photo.storage_path))].sort(),
    [photos]
  )

  const pathsKey = storagePaths.join('|')

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (storagePaths.length === 0) {
        setLoadingPaths(new Set())
        return
      }

      const missing = storagePaths.filter((path) => !urlByPathRef.current[path])
      if (missing.length === 0) {
        setLoadingPaths(new Set())
        return
      }

      setLoadingPaths(new Set(missing))

      const entries = await Promise.all(
        missing.map(async (path) => {
          const { url } = await createSignedPhotoUrl(supabase, path)
          return [path, url] as const
        })
      )

      if (cancelled) return

      setUrlByPath((previous) => {
        const next = { ...previous }
        for (const [path, url] of entries) {
          if (url) next[path] = url
        }
        return next
      })
      setLoadingPaths(new Set())
    })()

    return () => {
      cancelled = true
    }
  }, [pathsKey, storagePaths])

  const getUrl = (storagePath: string) => urlByPath[storagePath] ?? null
  const isLoading = (storagePath: string) => loadingPaths.has(storagePath)

  return { getUrl, isLoading, loading: loadingPaths.size > 0 }
}