export default async function handler(req, res) {
  const { code } = req.query

  if (!code) {
    return res.redirect('/?withings_error=no_code')
  }

  const clientId = process.env.WITHINGS_CLIENT_ID
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET
  const redirectUri = 'https://bodycomp-goals.vercel.app/api/withings/callback'

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
      return res.redirect('/?withings_error=token_failed')
    }

    const { access_token, refresh_token, userid } = tokenData.body

    // Redirect to dashboard with tokens in URL (we'll handle saving on the frontend)
    const params = new URLSearchParams({
      withings_success: 'true',
      access_token,
      refresh_token,
      withings_user_id: userid,
    })

    return res.redirect(`/?${params.toString()}`)
  } catch (error) {
    return res.redirect('/?withings_error=server_error')
  }
}
