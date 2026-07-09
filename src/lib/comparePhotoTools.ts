import type { CSSProperties } from 'react'

export type CompareBackground = 'dark' | 'black' | 'white' | 'light' | 'checkered'

export interface CompareToolSettings {
  swapped: boolean
  flipHorizontal: boolean
  overlayMode: boolean
  overlayOpacity: number
  blurAmount: number
  background: CompareBackground
  fitContain: boolean
}

export const DEFAULT_COMPARE_TOOLS: CompareToolSettings = {
  swapped: false,
  flipHorizontal: false,
  overlayMode: false,
  overlayOpacity: 50,
  blurAmount: 0,
  background: 'dark',
  fitContain: false,
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