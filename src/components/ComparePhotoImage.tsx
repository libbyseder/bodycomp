import type { CompareToolSettings } from '../lib/comparePhotoTools'

interface ComparePhotoImageProps {
  url: string
  alt: string
  settings: CompareToolSettings
  layer?: 'before' | 'after'
  opacity?: number
  className?: string
}

export default function ComparePhotoImage({
  url,
  alt,
  settings,
  layer = 'after',
  opacity = 1,
  className = '',
}: ComparePhotoImageProps) {
  const blur = layer === 'after' ? settings.blurAmount : 0
  const objectClass = settings.fitContain ? 'object-contain' : 'object-cover'

  return (
    <img
      src={url}
      alt={alt}
      draggable={false}
      decoding="async"
      className={`absolute inset-0 h-full w-full ${objectClass} ${className}`}
      style={{
        transform: settings.flipHorizontal ? 'scaleX(-1)' : undefined,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        opacity,
      }}
    />
  )
}