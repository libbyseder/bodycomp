import { getSupabaseAdmin } from '../../server/withingsTokens.js'
import { createWithingsOAuthState } from '../../server/withingsOAuthState.js'
import { buildWithingsLoginUrl } from '../../server/withingsOAuthUrl.js'

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

  let isApp = false
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    isApp = !!body?.app
  } catch {
    isApp = false
  }

  try {
    const state = createWithingsOAuthState(user.id, isApp)
    const url = buildWithingsLoginUrl(state)
    return res.status(200).json({ url })
  } catch (error) {
    console.error('Withings auth-start error:', error)
    return res.status(500).json({ error: error.message || 'Failed to start Withings auth' })
  }
}