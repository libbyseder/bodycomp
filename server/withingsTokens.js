import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase admin credentials are not configured')
  }
  return createClient(url, key)
}

const AUTH_ERROR_STATUSES = new Set([401, 2554, 2555, 501, 502])

export function isWithingsAuthError(status) {
  return AUTH_ERROR_STATUSES.has(status)
}

export async function refreshWithingsAccessToken(supabase, tokenData) {
  if (!tokenData?.refresh_token) {
    throw new Error('Withings session expired. Please reconnect Withings.')
  }

  const clientId = process.env.WITHINGS_CLIENT_ID
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Withings API credentials are not configured')
  }

  const response = await fetch('https://wbsapi.withings.net/v2/oauth2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      action: 'requesttoken',
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenData.refresh_token,
    }),
  })

  const data = await response.json()
  if (data.status !== 0) {
    throw new Error(
      isWithingsAuthError(data.status)
        ? 'Withings session expired. Please reconnect Withings.'
        : (data.error || `Withings token refresh failed (status ${data.status})`)
    )
  }

  const { access_token, refresh_token } = data.body
  const { error } = await supabase
    .from('withings_tokens')
    .update({
      access_token,
      refresh_token: refresh_token || tokenData.refresh_token,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', tokenData.user_id)

  if (error) {
    throw new Error(`Failed to save refreshed Withings token: ${error.message}`)
  }

  return access_token
}

export async function getValidWithingsAccessToken(supabase, userId) {
  const { data: tokenData, error } = await supabase
    .from('withings_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !tokenData?.access_token) {
    throw new Error('Withings not connected')
  }

  const updatedAt = tokenData.updated_at ? new Date(tokenData.updated_at).getTime() : 0
  const staleAfterMs = 2 * 60 * 60 * 1000

  if (Date.now() - updatedAt > staleAfterMs) {
    return refreshWithingsAccessToken(supabase, tokenData)
  }

  return tokenData.access_token
}