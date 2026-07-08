import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import type { Provider } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { getAuthRedirectUrl } from './authRedirect'

export async function signInWithProvider(provider: Provider): Promise<{ error: Error | null }> {
  const redirectTo = getAuthRedirectUrl()
  const isNative = Capacitor.isNativePlatform()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: isNative,
    },
  })

  if (error) {
    return { error }
  }

  if (isNative && data?.url) {
    try {
      await Browser.open({
        url: data.url,
        ...(Capacitor.getPlatform() === 'ios' ? { presentationStyle: 'popover' as const } : {}),
      })
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error('Failed to open sign-in browser'),
      }
    }
  }

  return { error: null }
}

function parseAuthCallbackParams(url: string): URLSearchParams | null {
  const queryIndex = url.indexOf('?')
  if (queryIndex === -1) return null
  return new URLSearchParams(url.slice(queryIndex + 1))
}

export async function handleAuthCallbackUrl(
  url: string
): Promise<{ handled: boolean; success: boolean; error?: string }> {
  const isAuthCallback =
    url.includes('auth/callback') ||
    (url.includes('code=') && !url.includes('withings'))

  if (!isAuthCallback) {
    return { handled: false, success: false }
  }

  const params = parseAuthCallbackParams(url)
  if (!params) {
    return { handled: true, success: false, error: 'Invalid auth callback' }
  }

  const authError = params.get('error_description') || params.get('error')
  if (authError) {
    try {
      await Browser.close()
    } catch {
      // Browser may already be closed
    }
    return { handled: true, success: false, error: authError }
  }

  const code = params.get('code')
  if (!code) {
    return { handled: true, success: false, error: 'Missing auth code' }
  }

  try {
    await Browser.close()
  } catch {
    // Browser may already be closed
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return { handled: true, success: false, error: error.message }
  }

  return { handled: true, success: true }
}

export function registerAuthDeepLinkHandler(
  onSuccess?: () => void,
  onError?: (message: string) => void
): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {}
  }

  const handleUrl = async (url: string) => {
    const result = await handleAuthCallbackUrl(url)
    if (!result.handled) return

    if (result.success) {
      onSuccess?.()
      return
    }

    if (result.error) {
      onError?.(result.error)
    }
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