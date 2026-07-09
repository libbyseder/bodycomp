import { Capacitor } from '@capacitor/core'

export type PhotoPickSource = 'gallery' | 'camera'

function extensionForFormat(format?: string): string {
  if (format === 'png') return 'png'
  if (format === 'webp') return 'webp'
  return 'jpg'
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const type = blob.type || 'image/jpeg'
  return new File([blob], filename, { type })
}

export function isNativePhotoPicker(): boolean {
  return Capacitor.isNativePlatform()
}

/** Use Capacitor Camera on iOS/Android — HTML file inputs are unreliable in WebViews. */
export async function pickProgressPhotoFile(
  source: PhotoPickSource
): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) {
    return null
  }

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      correctOrientation: true,
      presentationStyle: 'fullscreen',
    })

    if (!photo.dataUrl) {
      return null
    }

    const ext = extensionForFormat(photo.format)
    const stamp = Date.now()
    return dataUrlToFile(photo.dataUrl, `progress-${stamp}.${ext}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/cancel|dismiss|abort/i.test(message)) {
      return null
    }
    throw error
  }
}