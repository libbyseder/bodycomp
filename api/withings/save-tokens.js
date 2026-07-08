import { getSupabaseAdmin } from '../../server/withingsTokens.js'

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

  const { access_token, refresh_token, withings_user_id } = req.body

  try {
    // Check if tokens already exist for this user
    const { data: existing } = await supabase
      .from('withings_tokens')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      // Update existing row
      const { error } = await supabase
        .from('withings_tokens')
        .update({
          access_token,
          refresh_token,
          withings_user_id,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) throw error
    } else {
      // Insert new row
      const { error } = await supabase
        .from('withings_tokens')
        .insert({
          user_id: user.id,
          access_token,
          refresh_token,
          withings_user_id,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Supabase error:', error)
    return res.status(500).json({ error: 'Failed to save tokens', details: error.message })
  }
}
