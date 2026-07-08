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

export function sanitizeToken(value) {
  if (value == null) return ''
  return String(value).trim()
}

export function isWithingsAuthError(status) {
  return AUTH_ERROR_STATUSES.has(status)
}

export function isInvalidRefreshTokenResponse(data) {
  const message = String(data?.error || data?.body?.error || '').toLowerCase()
  return message.includes('refresh_token') || message.includes('invalid params')
}

export async function clearWithingsTokens(supabase, userId) {
  await supabase.from('withings_synced_grpids').delete().eq('user_id', userId)
  await supabase.from('withings_tokens').delete().eq('user_id', userId)
}

export async function saveWithingsTokensForUser(
  supabase,
  userId,
  { access_token, refresh_token, withings_user_id }
) {
  const accessToken = sanitizeToken(access_token)
  const refreshToken = sanitizeToken(refresh_token)
  const withingsUserId = sanitizeToken(withings_user_id)

  if (!accessToken || !refreshToken || !withingsUserId) {
    throw new Error('Withings tokens are incomplete')
  }

  const row = {
    access_token: accessToken,
    refresh_token: refreshToken,
    withings_user_id: withingsUserId,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('withings_tokens')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('withings_tokens').update(row).eq('user_id', userId)
    if (error) throw error
  } else {
    const { error } = await supabase.from('withings_tokens').insert({ user_id: userId, ...row })
    if (error) throw error
  }
}

export async function refreshWithingsAccessToken(supabase, tokenData) {
  const refreshToken = sanitizeToken(tokenData?.refresh_token)
  if (!refreshToken) {
    await clearWithingsTokens(supabase, tokenData.user_id)
    throw new Error('Withings connection expired. Go to Settings and tap Connect Withings again.')
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
      refresh_token: refreshToken,
    }),
  })

  const data = await response.json()
  if (data.status !== 0) {
    if (isWithingsAuthError(data.status) || isInvalidRefreshTokenResponse(data)) {
      await clearWithingsTokens(supabase, tokenData.user_id)
      throw new Error('Withings connection expired. Go to Settings and tap Connect Withings again.')
    }

    throw new Error(data.error || `Withings token refresh failed (status ${data.status})`)
  }

  const access_token = sanitizeToken(data.body?.access_token)
  const next_refresh_token = sanitizeToken(data.body?.refresh_token) || refreshToken

  if (!access_token) {
    throw new Error('Withings token refresh returned an empty access token')
  }

  const { error } = await supabase
    .from('withings_tokens')
    .update({
      access_token,
      refresh_token: next_refresh_token,
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

  return sanitizeToken(tokenData.access_token)
}

export async function getWithingsTokenRow(supabase, userId) {
  const { data: tokenData, error } = await supabase
    .from('withings_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !tokenData?.access_token) {
    throw new Error('Withings not connected')
  }

  return {
    ...tokenData,
    access_token: sanitizeToken(tokenData.access_token),
    refresh_token: sanitizeToken(tokenData.refresh_token),
  }
}