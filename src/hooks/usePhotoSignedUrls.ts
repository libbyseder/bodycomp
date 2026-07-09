import { useEffect, useMemo, useState } from 'react'
import type { ProgressPhoto } from '../types'
import { fetchSignedPhotoUrl, peekSignedPhotoUrl } from '../lib/photoSignedUrlCache'

export function usePhotoSignedUrls(photos: ProgressPhoto[]) {
  const [urlByPath, setUrlByPath] = useState<Record<string, string>>({})
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set())

  const storagePaths = useMemo(
    () => [...new Set(photos.map((photo) => photo.storage_path))].sort(),
    [photos]
  )

  const pathsKey = storagePaths.join('|')

  useEffect(() => {
    let cancelled = false

    const syncFromCache = () => {
      const fromCache: Record<string, string> = {}
      for (const path of storagePaths) {
        const cached = peekSignedPhotoUrl(path)
        if (cached) fromCache[path] = cached
      }
      if (Object.keys(fromCache).length > 0) {
        setUrlByPath((previous) => ({ ...previous, ...fromCache }))
      }
      return fromCache
    }

    ;(async () => {
      if (storagePaths.length === 0) {
        setLoadingPaths(new Set())
        return
      }

      const fromCache = syncFromCache()
      const missing = storagePaths.filter((path) => !fromCache[path])
      if (missing.length === 0) {
        setLoadingPaths(new Set())
        return
      }

      setLoadingPaths(new Set(missing))

      await Promise.all(
        missing.map(async (path) => {
          const url = await fetchSignedPhotoUrl(path)
          if (cancelled || !url) return
          setUrlByPath((previous) =>
            previous[path] === url ? previous : { ...previous, [path]: url }
          )
        })
      )

      if (!cancelled) {
        setLoadingPaths(new Set())
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pathsKey, storagePaths])

  const getUrl = (storagePath: string) =>
    urlByPath[storagePath] ?? peekSignedPhotoUrl(storagePath)

  const isLoading = (storagePath: string) =>
    loadingPaths.has(storagePath) && !getUrl(storagePath)

  return { getUrl, isLoading, loading: loadingPaths.size > 0 }
}