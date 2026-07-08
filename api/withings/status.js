import { getSupabaseAdmin } from '../../server/withingsTokens.js'

const supabase = getSupabaseAdmin()

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })

  const token = authHeader.split(' ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) return res.status(401).json({ error: 'Invalid user' })

  const { data, error } = await supabase
    .from('withings_tokens')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Withings status error:', error)
    return res.status(500).json({ error: 'Failed to check connection' })
  }

  return res.status(200).json({ connected: !!data })
}