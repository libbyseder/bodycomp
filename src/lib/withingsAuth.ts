import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from './supabase'
import { apiUrl } from './apiBase'

export async function openWithingsAuth(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Please log in before connecting Withings')
  }

  const response = await fetch(apiUrl('/api/withings/auth-start'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ app: Capacitor.isNativePlatform() }),
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.url) {
    throw new Error(result.error || 'Failed to start Withings authorization')
  }

  if (Capacitor.isNativePlatform()) {
    await Browser.open({
      url: result.url,
      ...(Capacitor.getPlatform() === 'ios' ? { presentationStyle: 'popover' as const } : {}),
    })
    return
  }

  window.location.href = result.url
}

export function parseWithingsDeepLink(url: string): URLSearchParams | null {
  const queryIndex = url.indexOf('?')
  if (queryIndex === -1) return null
  return new URLSearchParams(url.slice(queryIndex + 1))
}