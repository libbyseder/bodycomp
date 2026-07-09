import { clearWithingsTokens, getSupabaseAdmin } from '../../server/withingsTokens.js'

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

  try {
    await clearWithingsTokens(supabase, user.id)
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Withings disconnect error:', error)
    return res.status(500).json({ error: error.message || 'Failed to disconnect Withings' })
  }
}