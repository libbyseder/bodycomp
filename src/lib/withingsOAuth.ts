import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { parseWithingsDeepLink } from './withingsAuth'

type SaveTokensFn = (
  access_token: string,
  refresh_token: string,
  withings_user_id: string
) => Promise<void>

type ConnectedFn = () => Promise<void>

export function registerWithingsDeepLinkHandler(
  onConnected: ConnectedFn,
  saveTokens?: SaveTokensFn
): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {}
  }

  const handleUrl = async (url: string) => {
    if (!url.includes('withings-callback') && !url.includes('withings_success')) {
      return
    }

    const params = parseWithingsDeepLink(url)
    if (!params) return

    if (params.get('withings_error')) {
      try {
        await Browser.close()
      } catch {
        // Browser may already be closed
      }
      return
    }

    if (params.get('withings_success') !== 'true') return

    try {
      await Browser.close()
    } catch {
      // Browser may already be closed
    }

    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    const withings_user_id = params.get('withings_user_id')

    if (access_token && refresh_token && withings_user_id && saveTokens) {
      await saveTokens(access_token, refresh_token, withings_user_id)
      return
    }

    await onConnected()
  }

  const listeners: Array<{ remove: () => void }> = []

  CapApp.addListener('appUrlOpen', ({ url }) => {
    void handleUrl(url)
  }).then((handle) => listeners.push(handle))

  CapApp.getLaunchUrl().then((result) => {
    if (result?.url) {
      void handleUrl(result.url)
    }
  })

  return () => {
    listeners.forEach((listener) => listener.remove())
  }
}