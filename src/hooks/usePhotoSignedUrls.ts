import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProgressPhoto } from '../types'
import { fetchSignedPhotoUrl, peekSignedPhotoUrl } from '../lib/photoSignedUrlCache'

function mergeUrlMaps(
  previous: Record<string, string>,
  additions: Record<string, string>
): Record<string, string> {
  let changed = false
  const next = { ...previous }

  for (const [path, url] of Object.entries(additions)) {
    if (next[path] !== url) {
      next[path] = url
      changed = true
    }
  }

  return changed ? next : previous
}

export function usePhotoSignedUrls(photos: ProgressPhoto[]) {
  const pathsKey = useMemo(
    () => [...new Set(photos.map((photo) => photo.storage_path))].sort().join('|'),
    [photos]
  )

  const [urlByPath, setUrlByPath] = useState<Record<string, string>>({})
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    let cancelled = false
    const storagePaths = pathsKey ? pathsKey.split('|') : []

    if (storagePaths.length === 0) {
      setLoadingPaths(new Set())
      return
    }

    const cachedUrls: Record<string, string> = {}
    for (const path of storagePaths) {
      const cached = peekSignedPhotoUrl(path)
      if (cached) cachedUrls[path] = cached
    }

    if (Object.keys(cachedUrls).length > 0) {
      setUrlByPath((previous) => mergeUrlMaps(previous, cachedUrls))
    }

    const missing = storagePaths.filter((path) => !cachedUrls[path])
    if (missing.length === 0) {
      setLoadingPaths(new Set())
      return
    }

    setLoadingPaths(new Set(missing))

    ;(async () => {
      const fetchedUrls: Record<string, string> = {}

      await Promise.all(
        missing.map(async (path) => {
          const url = await fetchSignedPhotoUrl(path)
          if (url) fetchedUrls[path] = url
        })
      )

      if (cancelled) return

      if (Object.keys(fetchedUrls).length > 0) {
        setUrlByPath((previous) => mergeUrlMaps(previous, fetchedUrls))
      }
      setLoadingPaths(new Set())
    })()

    return () => {
      cancelled = true
    }
  }, [pathsKey])

  const getUrl = useCallback(
    (storagePath: string) => urlByPath[storagePath] ?? peekSignedPhotoUrl(storagePath),
    [urlByPath]
  )

  const isLoading = useCallback(
    (storagePath: string) => loadingPaths.has(storagePath) && !getUrl(storagePath),
    [loadingPaths, getUrl]
  )

  return { getUrl, isLoading, loading: loadingPaths.size > 0 }
}