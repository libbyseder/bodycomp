import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { code } = req.query

  if (!code) {
    return res.status(400).json({ error: 'No code provided' })
  }

  const clientId = process.env.WITHINGS_CLIENT_ID
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET
  const redirectUri = 'https://bodycomp-goals.vercel.app/api/withings/callback'

  try {
    // Exchange code for tokens
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
      return res.status(400).json({ error: 'Token exchange failed', details: tokenData })
    }

    const { access_token, refresh_token, userid } = tokenData.body

    // TODO: Get the real logged-in user ID from your auth system
    // For now we'll use a placeholder. We'll fix this properly in the next step.
    const userId = 'CURRENT_LOGGED_IN_USER_ID' // ← We'll replace this

    // Save tokens to Supabase
    const { error } = await supabase.from('withings_tokens').upsert({
      user_id: userId,
      access_token,
      refresh_token,
      withings_user_id: userid,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      return res.status(500).json({ error: 'Failed to save tokens', details: error })
    }

    return res.status(200).json({
      message: 'Successfully connected to Withings and tokens saved!',
      withings_user_id: userid,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
}
