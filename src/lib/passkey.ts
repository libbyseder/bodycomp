import { supabase } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const PASSKEY_RP_ID = 'bodycomp-goals.vercel.app'

export const PASSKEY_SETUP_STEPS = [
  'Open Supabase Dashboard → Authentication → Passkeys',
  'Turn on Enable Passkey authentication',
  `Set Relying Party ID to: ${PASSKEY_RP_ID}`,
  'Set Display Name to: BodyTrend',
  `Add Origins: https://${PASSKEY_RP_ID} and http://localhost:5173`,
]

export function isSecurePasskeyContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext
}

export function isPasskeySupported(): boolean {
  return (
    isSecurePasskeyContext() &&
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  )
}

export async function checkPasskeyServerEnabled(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/passkeys/authentication/options`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    return response.ok
  } catch {
    return false
  }
}

export function formatPasskeyError(error: {
  message?: string
  code?: string
  status?: number
  name?: string
} | null | undefined): string {
  if (!error) return 'Passkey operation failed'

  const message = error.message ?? ''
  const code = error.code ?? ''
  const lower = message.toLowerCase()

  if (
    code === 'passkey_disabled' ||
    error.status === 404 ||
    lower.includes('not found') ||
    lower.includes('404')
  ) {
    return 'Passkeys are not enabled in Supabase yet. Turn them on under Authentication → Passkeys in your project dashboard.'
  }

  if (code === 'webauthn_verification_failed') {
    return 'Passkey verification failed. Check that Supabase Passkey RP ID and Origins match this site.'
  }

  if (code === 'webauthn_credential_not_found') {
    return 'No passkey found for this device. Sign in another way, then add a passkey in Settings.'
  }

  if (code === 'email_not_confirmed' || code === 'phone_not_confirmed') {
    return 'Confirm your email before using a passkey.'
  }

  if (
    message === 'The operation either timed out or was not allowed.' ||
    error.name === 'NotAllowedError'
  ) {
    return 'Passkey was cancelled or timed out.'
  }

  if (lower.includes('experimental') && lower.includes('disabled')) {
    return 'Passkey support is disabled in the app client configuration.'
  }

  return message || 'Passkey operation failed'
}

export async function hasActiveSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}