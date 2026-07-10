/** Primary bottom tabs + settings (header only, not in tab bar). */
export type TabId = 'home' | 'trends' | 'log' | 'photos' | 'settings'

export type PhotosSection = 'gallery' | 'compare'

export const TAB_LABELS: Record<TabId, string> = {
  home: 'Home',
  trends: 'Trends',
  log: 'Log',
  photos: 'Photos',
  settings: 'Settings',
}

/** Tabs shown in the bottom navigation bar (settings is header-only). */
export const BOTTOM_TABS: Exclude<TabId, 'settings'>[] = [
  'home',
  'trends',
  'log',
  'photos',
]
