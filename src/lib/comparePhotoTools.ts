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
  /**
   * When true, photos use object-contain so the stage background shows.
   * Always recommended once cutouts or non-cover backdrops are active.
   */
  fitContain: boolean
  /**
   * Adjust panel open: zoom/pan alignment + brightness/contrast for the active layer.
   * When true, single-finger drag pans the selected layer instead of moving the slider.
   */
  adjustMode: boolean
  /** Background picker sheet open */
  backgroundPickerOpen: boolean
  /** Which photo is being adjusted by pinch/pan and per-image controls */
  activeLayer: CompareAdjustLayer
  beforeAdjust: ImageAdjustSettings
  afterAdjust: ImageAdjustSettings
}

/** Serializable edits saved per photo pair (no blob URLs). */
export interface ComparePairEdits {
  swapped: boolean
  flipHorizontal: boolean
  overlayMode: boolean
  overlayOpacity: number
  blurAmount: number
  background: CompareBackground
  fitContain: boolean
  beforeAdjust: ImageAdjustSettings
  afterAdjust: ImageAdjustSettings
  /** Re-apply AI cutout when this pair is loaded */
  beforeCutout: boolean
  afterCutout: boolean
  savedAt: string
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
  // Start with contain so stage background is always visible (GainFrame-style)
  background: 'dark',
  fitContain: true,
  adjustMode: false,
  backgroundPickerOpen: false,
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

export function isEditingTools(settings: CompareToolSettings): boolean {
  return settings.adjustMode || settings.backgroundPickerOpen
}

/** Exit edit panels but keep applied transforms / lighting / backdrop. */
export function doneEditingPatch(): Partial<CompareToolSettings> {
  return {
    adjustMode: false,
    backgroundPickerOpen: false,
  }
}

/** Full visual reset of tool settings (keeps photo pair; clears cutouts separately). */
export function resetAllToolsPatch(): CompareToolSettings {
  return {
    ...DEFAULT_COMPARE_TOOLS,
    beforeAdjust: { ...DEFAULT_IMAGE_ADJUST },
    afterAdjust: { ...DEFAULT_IMAGE_ADJUST },
  }
}

export function resetLayerAdjustPatch(
  settings: CompareToolSettings,
  layer: CompareAdjustLayer
): Partial<CompareToolSettings> {
  return patchLayerAdjust(settings, layer, { ...DEFAULT_IMAGE_ADJUST })
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

export const COMPARE_BACKGROUND_SWATCHES: Record<CompareBackground, string> = {
  dark: '#09090b',
  black: '#000000',
  white: '#ffffff',
  light: '#e4e4e7',
  checkered:
    'linear-gradient(45deg, #3f3f46 25%, #27272a 25%, #27272a 50%, #3f3f46 50%, #3f3f46 75%, #27272a 75%)',
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

export function pairEditsStorageKey(beforePhotoId: string, afterPhotoId: string): string {
  return `bodytrend.compareEdits.v1.${beforePhotoId}.${afterPhotoId}`
}

export function toPairEdits(
  settings: CompareToolSettings,
  beforeCutout: boolean,
  afterCutout: boolean
): ComparePairEdits {
  return {
    swapped: settings.swapped,
    flipHorizontal: settings.flipHorizontal,
    overlayMode: settings.overlayMode,
    overlayOpacity: settings.overlayOpacity,
    blurAmount: settings.blurAmount,
    background: settings.background,
    fitContain: settings.fitContain,
    beforeAdjust: { ...settings.beforeAdjust },
    afterAdjust: { ...settings.afterAdjust },
    beforeCutout,
    afterCutout,
    savedAt: new Date().toISOString(),
  }
}

export function applyPairEdits(edits: ComparePairEdits): CompareToolSettings {
  return {
    ...DEFAULT_COMPARE_TOOLS,
    swapped: edits.swapped,
    flipHorizontal: edits.flipHorizontal,
    overlayMode: edits.overlayMode,
    overlayOpacity: edits.overlayOpacity,
    blurAmount: edits.blurAmount,
    background: edits.background,
    fitContain: edits.fitContain,
    beforeAdjust: { ...DEFAULT_IMAGE_ADJUST, ...edits.beforeAdjust },
    afterAdjust: { ...DEFAULT_IMAGE_ADJUST, ...edits.afterAdjust },
    // Always leave edit panels closed when loading a saved pair
    adjustMode: false,
    backgroundPickerOpen: false,
  }
}

export function loadPairEdits(
  beforePhotoId: string,
  afterPhotoId: string
): ComparePairEdits | null {
  try {
    const raw = localStorage.getItem(pairEditsStorageKey(beforePhotoId, afterPhotoId))
    if (!raw) return null
    return JSON.parse(raw) as ComparePairEdits
  } catch {
    return null
  }
}

export function savePairEdits(
  beforePhotoId: string,
  afterPhotoId: string,
  edits: ComparePairEdits
): void {
  try {
    localStorage.setItem(
      pairEditsStorageKey(beforePhotoId, afterPhotoId),
      JSON.stringify(edits)
    )
  } catch (err) {
    console.warn('Failed to save compare edits', err)
  }
}

export function clearPairEdits(beforePhotoId: string, afterPhotoId: string): void {
  try {
    localStorage.removeItem(pairEditsStorageKey(beforePhotoId, afterPhotoId))
  } catch {
    /* ignore */
  }
}
