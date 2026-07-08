import { Capacitor } from '@capacitor/core'

const PRODUCTION_ORIGIN = 'https://bodycomp-goals.vercel.app'
const NATIVE_AUTH_CALLBACK = 'recomptrack://auth/callback'

export function getAuthRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return NATIVE_AUTH_CALLBACK
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }

  return PRODUCTION_ORIGIN
}

export function isPasskeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  )
}