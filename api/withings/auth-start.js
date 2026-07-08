import { getSupabaseAdmin } from '../../server/withingsTokens.js'
import { createWithingsOAuthState } from '../../server/withingsOAuthState.js'

const supabase = getSupabaseAdmin()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })

  const token = authHeader.split(' ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Invalid user' })

  const clientId = process.env.WITHINGS_CLIENT_ID
  if (!clientId) {
    return res.status(500).json({ error: 'Withings client ID is not configured' })
  }

  let isApp = false
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    isApp = !!body?.app
  } catch {
    isApp = false
  }

  const redirectUri = 'https://bodycomp-goals.vercel.app/api/withings/callback'
  const scope = 'user.metrics'

  try {
    const state = createWithingsOAuthState(user.id, isApp)
    const authUrl = new URL('https://account.withings.com/oauth2_user/authorize2')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('state', state)

    return res.status(200).json({ url: authUrl.toString() })
  } catch (error) {
    console.error('Withings auth-start error:', error)
    return res.status(500).json({ error: error.message || 'Failed to start Withings auth' })
  }
}