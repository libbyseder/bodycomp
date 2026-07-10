import type { CompareAdjustLayer, CompareToolSettings } from '../lib/comparePhotoTools'
import {
  getLayerAdjust,
  imageAdjustFilter,
  imageAdjustTransform,
} from '../lib/comparePhotoTools'

interface ComparePhotoImageProps {
  url: string
  alt: string
  settings: CompareToolSettings
  layer?: CompareAdjustLayer
  opacity?: number
  className?: string
  /** When set, overrides storage URL (e.g. AI background-removed blob) */
  displayUrl?: string | null
  /** Force contain so stage backdrop / cutouts are visible */
  forceContain?: boolean
}

export default function ComparePhotoImage({
  url,
  alt,
  settings,
  layer = 'after',
  opacity = 1,
  className = '',
  displayUrl,
  forceContain = false,
}: ComparePhotoImageProps) {
  const adjust = getLayerAdjust(settings, layer)
  // Soft blur only on the base (after) layer so overlay stays sharp for alignment
  const blur = layer === 'after' ? settings.blurAmount : 0
  const useContain = forceContain || settings.fitContain || Boolean(displayUrl)
  const objectClass = useContain ? 'object-contain' : 'object-cover'
  const src = displayUrl || url

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      decoding="async"
      className={`absolute inset-0 h-full w-full ${objectClass} ${className}`}
      style={{
        transform: imageAdjustTransform(adjust, settings.flipHorizontal),
        transformOrigin: 'center center',
        filter: imageAdjustFilter(adjust, blur),
        opacity,
        willChange: 'transform, filter',
      }}
    />
  )
}
