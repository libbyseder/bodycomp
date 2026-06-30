import { Capacitor } from '@capacitor/core'

const PRODUCTION_API = 'https://bodycomp-goals.vercel.app'

export function getApiBase(): string {
  if (Capacitor.isNativePlatform()) {
    return (import.meta.env.VITE_API_BASE_URL as string | undefined) || PRODUCTION_API
  }
  return ''
}

export function apiUrl(path: string): string {
  const base = getApiBase()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}