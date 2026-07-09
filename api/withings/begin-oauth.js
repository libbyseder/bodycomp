import { verifyWithingsOAuthState } from '../../server/withingsOAuthState.js'
import { buildWithingsLoginUrl } from '../../server/withingsOAuthUrl.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const state = req.query.state
  const payload = verifyWithingsOAuthState(state)
  if (!payload) {
    return res
      .status(400)
      .send('This Withings connection link expired. Go back to BodyTrend and tap Connect Withings again.')
  }

  try {
    const loginUrl = buildWithingsLoginUrl(state)
    res.setHeader('Cache-Control', 'no-store')
    return res.redirect(302, loginUrl)
  } catch (error) {
    console.error('Withings begin-oauth error:', error)
    return res.status(500).send(error.message || 'Withings is not configured on the server.')
  }
}