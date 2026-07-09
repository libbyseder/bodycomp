import { getSupabaseAdmin, saveWithingsTokensForUser } from '../../server/withingsTokens.js'
import { verifyWithingsOAuthState } from '../../server/withingsOAuthState.js'
import { WITHINGS_REDIRECT_URI } from '../../server/withingsOAuthUrl.js'

const supabase = getSupabaseAdmin()

export default async function handler(req, res) {
  const { code, state } = req.query

  const statePayload = verifyWithingsOAuthState(state)
  const isApp = statePayload?.app || state === 'recomptrack_app'
  const legacyState = state === 'recomptrack_app' || state === 'secure_random_state'

  if (!code) {
    const target = isApp
      ? 'recomptrack://withings-callback?withings_error=no_code'
      : '/?withings_error=no_code'
    return res.redirect(target)
  }

  const clientId = process.env.WITHINGS_CLIENT_ID
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET
  const redirectUri = WITHINGS_REDIRECT_URI

  try {
    const tokenResponse = await fetch('https://wbsapi.withings.net/v2/oauth2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'requesttoken',
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.status !== 0) {
      const target = isApp
        ? 'recomptrack://withings-callback?withings_error=token_failed'
        : '/?withings_error=token_failed'
      return res.redirect(target)
    }

    const { access_token, refresh_token, userid } = tokenData.body

    if (statePayload?.uid) {
      await saveWithingsTokensForUser(supabase, statePayload.uid, {
        access_token,
        refresh_token,
        withings_user_id: userid,
      })

      const target = isApp
        ? 'recomptrack://withings-callback?withings_success=true'
        : '/?withings_success=true'

      return res.redirect(target)
    }

    if (legacyState) {
      const params = new URLSearchParams({
        withings_success: 'true',
        access_token,
        refresh_token,
        withings_user_id: userid,
      })

      const target = isApp
        ? `recomptrack://withings-callback?${params.toString()}`
        : `/?${params.toString()}`

      return res.redirect(target)
    }

    const target = isApp
      ? 'recomptrack://withings-callback?withings_error=invalid_state'
      : '/?withings_error=invalid_state'
    return res.redirect(target)
  } catch (error) {
    console.error('Withings callback error:', error)
    const target = isApp
      ? 'recomptrack://withings-callback?withings_error=server_error'
      : '/?withings_error=server_error'
    return res.redirect(target)
  }
}