/**
 * Client-side AI background removal via @imgly/background-removal (ONNX/WASM).
 * Models download from CDN on first use.
 */

export type BackgroundRemovalProgress = {
  key: string
  current: number
  total: number
}

type RemoveBackgroundFn = (
  imageSource: string,
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

/**
 * Remove the background from an image URL and return a PNG object URL.
 * Caller should revoke the object URL when done.
 */
export async function removePhotoBackground(
  imageUrl: string,
  onProgress?: (progress: BackgroundRemovalProgress) => void
): Promise<string> {
  const removeBackground = await loadRemover()

  const blob = await removeBackground(imageUrl, {
    output: {
      format: 'image/png',
      quality: 0.9,
    },
    progress: (key, current, total) => {
      onProgress?.({ key, current, total })
    },
  })

  return URL.createObjectURL(blob)
}

export function revokeObjectUrl(url: string | null | undefined) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}
