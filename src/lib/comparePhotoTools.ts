import type { CSSProperties } from 'react'

export type CompareBackground = 'dark' | 'black' | 'white' | 'light' | 'checkered'
export type CompareAdjustLayer = 'before' | 'after'

export interface ImageAdjustSettings {
  /** Scale multiplier (1 = 100%) */
  scale: number
  /** Horizontal pan in pixels */
  offsetX: number
  /** Vertical pan in pixels */
  offsetY: number
  /** CSS brightness percentage (100 = normal) */
  brightness: number
  /** CSS contrast percentage (100 = normal) */
  contrast: number
}

export interface CompareToolSettings {
  swapped: boolean
  flipHorizontal: boolean
  overlayMode: boolean
  overlayOpacity: number
  blurAmount: number
  background: CompareBackground
  fitContain: boolean
  /** When true, single-finger drag pans the selected layer instead of moving the slider */
  alignMode: boolean
  /** Which photo is being adjusted by pinch/pan and per-image controls */
  activeLayer: CompareAdjustLayer
  beforeAdjust: ImageAdjustSettings
  afterAdjust: ImageAdjustSettings
}

export const DEFAULT_IMAGE_ADJUST: ImageAdjustSettings = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  brightness: 100,
  contrast: 100,
}

export const DEFAULT_COMPARE_TOOLS: CompareToolSettings = {
  swapped: false,
  flipHorizontal: false,
  overlayMode: false,
  overlayOpacity: 50,
  blurAmount: 0,
  background: 'dark',
  fitContain: false,
  alignMode: false,
  activeLayer: 'before',
  beforeAdjust: { ...DEFAULT_IMAGE_ADJUST },
  afterAdjust: { ...DEFAULT_IMAGE_ADJUST },
}

export function getLayerAdjust(
  settings: CompareToolSettings,
  layer: CompareAdjustLayer
): ImageAdjustSettings {
  return layer === 'before' ? settings.beforeAdjust : settings.afterAdjust
}

export function patchLayerAdjust(
  settings: CompareToolSettings,
  layer: CompareAdjustLayer,
  patch: Partial<ImageAdjustSettings>
): Partial<CompareToolSettings> {
  const key = layer === 'before' ? 'beforeAdjust' : 'afterAdjust'
  const current = getLayerAdjust(settings, layer)
  return {
    [key]: { ...current, ...patch },
  }
}

export function imageAdjustFilter(
  adjust: ImageAdjustSettings,
  blurAmount = 0
): string | undefined {
  const parts: string[] = []
  if (adjust.brightness !== 100) parts.push(`brightness(${adjust.brightness}%)`)
  if (adjust.contrast !== 100) parts.push(`contrast(${adjust.contrast}%)`)
  if (blurAmount > 0) parts.push(`blur(${blurAmount}px)`)
  return parts.length > 0 ? parts.join(' ') : undefined
}

export function imageAdjustTransform(
  adjust: ImageAdjustSettings,
  flipHorizontal: boolean
): string {
  const parts = [
    `translate(${adjust.offsetX}px, ${adjust.offsetY}px)`,
    `scale(${adjust.scale})`,
  ]
  if (flipHorizontal) parts.push('scaleX(-1)')
  return parts.join(' ')
}

export function isDefaultImageAdjust(adjust: ImageAdjustSettings): boolean {
  return (
    adjust.scale === DEFAULT_IMAGE_ADJUST.scale &&
    adjust.offsetX === DEFAULT_IMAGE_ADJUST.offsetX &&
    adjust.offsetY === DEFAULT_IMAGE_ADJUST.offsetY &&
    adjust.brightness === DEFAULT_IMAGE_ADJUST.brightness &&
    adjust.contrast === DEFAULT_IMAGE_ADJUST.contrast
  )
}

export function compareBackgroundStyle(background: CompareBackground): CSSProperties {
  switch (background) {
    case 'black':
      return { backgroundColor: '#000000' }
    case 'white':
      return { backgroundColor: '#ffffff' }
    case 'light':
      return { backgroundColor: '#e4e4e7' }
    case 'checkered':
      return {
        backgroundColor: '#27272a',
        backgroundImage:
          'linear-gradient(45deg, #3f3f46 25%, transparent 25%), linear-gradient(-45deg, #3f3f46 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3f3f46 75%), linear-gradient(-45deg, transparent 75%, #3f3f46 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
      }
    default:
      return { backgroundColor: '#09090b' }
  }
}

export const COMPARE_BACKGROUND_LABELS: Record<CompareBackground, string> = {
  dark: 'Dark',
  black: 'Black',
  white: 'White',
  light: 'Light',
  checkered: 'Grid',
}

export const COMPARE_BACKGROUND_ORDER: CompareBackground[] = [
  'dark',
  'black',
  'light',
  'white',
  'checkered',
]

export const MIN_COMPARE_SCALE = 0.5
export const MAX_COMPARE_SCALE = 4
export const MIN_BRIGHTNESS = 40
export const MAX_BRIGHTNESS = 180
export const MIN_CONTRAST = 40
export const MAX_CONTRAST = 180

export function clampScale(scale: number): number {
  return Math.min(MAX_COMPARE_SCALE, Math.max(MIN_COMPARE_SCALE, scale))
}

export function clampBrightness(value: number): number {
  return Math.min(MAX_BRIGHTNESS, Math.max(MIN_BRIGHTNESS, value))
}

export function clampContrast(value: number): number {
  return Math.min(MAX_CONTRAST, Math.max(MIN_CONTRAST, value))
}
