import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
    const { error } = await supabase.from('withings_tokens').upsert({
      user_id: user.id,
      access_token,
      refresh_token,
      withings_user_id,
      updated_at: new Date().toISOString()
    })

    if (error) {
      console.error('Supabase upsert error:', error)
      return res.status(500).json({ error: 'Failed to save tokens', details: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Server error' })
  }
}
