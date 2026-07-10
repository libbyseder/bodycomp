/**
 * Client-side AI background removal via @imgly/background-removal (ONNX/WASM).
 * Models download from CDN on first use.
 *
 * Images are fetched as blobs first so signed Supabase URLs work even when
 * the WASM runtime cannot read cross-origin URLs directly.
 */

export type BackgroundRemovalProgress = {
  key: string
  current: number
  total: number
}

type RemoveBackgroundFn = (
  imageSource: Blob | string,
  config?: {
    output?: { format?: 'image/png' | 'image/jpeg' | 'image/webp'; quality?: number }
    progress?: (key: string, current: number, total: number) => void
  }
) => Promise<Blob>

let removeBackgroundFn: RemoveBackgroundFn | null = null

async function loadRemover(): Promise<RemoveBackgroundFn> {
  if (removeBackgroundFn) return removeBackgroundFn

  const mod = await import('@imgly/background-removal')
  removeBackgroundFn = mod.removeBackground as unknown as RemoveBackgroundFn
  return removeBackgroundFn
}

async function fetchImageBlob(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl, { mode: 'cors', credentials: 'omit' })
  if (!response.ok) {
    throw new Error(`Could not load photo for cutout (${response.status})`)
  }
  const blob = await response.blob()
  if (!blob.type.startsWith('image/') && blob.size === 0) {
    throw new Error('Photo data was empty')
  }
  return blob
}

/**
 * Remove the background from an image URL and return a PNG object URL.
 * Caller should revoke the object URL when done.
 */
export async function removePhotoBackground(
  imageUrl: string,
  onProgress?: (progress: BackgroundRemovalProgress) => void
): Promise<string> {
  const removeBackground = await loadRemover()
  const sourceBlob = await fetchImageBlob(imageUrl)

  const resultBlob = await removeBackground(sourceBlob, {
    output: {
      format: 'image/png',
      quality: 0.9,
    },
    progress: (key, current, total) => {
      onProgress?.({ key, current, total })
    },
  })

  return URL.createObjectURL(resultBlob)
}

export function revokeObjectUrl(url: string | null | undefined) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}
