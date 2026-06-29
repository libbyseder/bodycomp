export default async function handler(req, res) {
  const clientId = process.env.WITHINGS_CLIENT_ID
  const redirectUri = 'https://bodycomp-goals.vercel.app/api/withings/callback'
  const scope = 'user.metrics' // We need body composition data

  const authUrl = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=secure_random_state`

  res.redirect(authUrl)
}
