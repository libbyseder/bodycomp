import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { apiUrl } from './apiBase'

export async function openWithingsAuth(): Promise<void> {
  const url = Capacitor.isNativePlatform()
    ? apiUrl('/api/withings/auth?app=1')
    : apiUrl('/api/withings/auth')

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url, presentationStyle: 'popover' })
    return
  }

  window.location.href = url
}

export function parseWithingsDeepLink(url: string): URLSearchParams | null {
  const queryIndex = url.indexOf('?')
  if (queryIndex === -1) return null
  return new URLSearchParams(url.slice(queryIndex + 1))
}