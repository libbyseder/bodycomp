import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from './supabase'
import { apiUrl } from './apiBase'

async function getAuthStartUrl(): Promise<string> {
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

  return result.url
}

export async function disconnectWithings(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  await fetch(apiUrl('/api/withings/disconnect'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })
}

export async function openWithingsAuth(options?: { switchAccount?: boolean }): Promise<void> {
  // Always clear BodyTrend's stored Withings tokens before a new OAuth attempt.
  await disconnectWithings()

  const url = await getAuthStartUrl()

  if (Capacitor.isNativePlatform()) {
    await Browser.open({
      url,
      ...(Capacitor.getPlatform() === 'ios' ? { presentationStyle: 'popover' as const } : {}),
    })
    return
  }

  window.location.href = url
}

export function parseWithingsDeepLink(url: string): URLSearchParams | null {
  const queryIndex = url.indexOf('?')
  if (queryIndex === -1) return null
  return new URLSearchParams(url.slice(queryIndex + 1))
}