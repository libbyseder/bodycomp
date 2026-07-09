import { buildWithingsLoginUrl } from '../../server/withingsOAuthUrl.js'

export default async function handler(req, res) {
  const isApp = req.query.app === '1'
  const state = isApp ? 'recomptrack_app' : 'secure_random_state'

  try {
    const loginUrl = buildWithingsLoginUrl(state)
    return res.redirect(loginUrl)
  } catch (error) {
    console.error('Withings auth redirect error:', error)
    return res.status(500).json({ error: error.message || 'Withings is not configured' })
  }
}