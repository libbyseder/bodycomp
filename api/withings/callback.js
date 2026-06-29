export default async function handler(req, res) {
  const { code } = req.query

  if (!code) {
    return res.status(400).json({ error: 'No code provided' })
  }

  const clientId = process.env.WITHINGS_CLIENT_ID
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET
  const redirectUri = 'https://bodycomp-goals.vercel.app/api/withings/callback'

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://wbsapi.withings.net/v2/oauth2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
      return res.status(400).json({ error: 'Failed to get token', details: tokenData })
    }

    // For now, just return the tokens so we can see them
    return res.status(200).json({
      message: 'Successfully connected to Withings!',
      access_token: tokenData.body.access_token,
      refresh_token: tokenData.body.refresh_token,
      user_id: tokenData.body.userid,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
}
