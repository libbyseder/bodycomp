import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const { access_token, refresh_token, withings_user_id } = req.body
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  // Get user from Supabase using the JWT from the frontend
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid user' })
  }

  // Save tokens
  const { error } = await supabase.from('withings_tokens').upsert({
    user_id: user.id,
    access_token,
    refresh_token,
    withings_user_id,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    return res.status(500).json({ error: 'Failed to save tokens', details: error })
  }

  return res.status(200).json({ success: true })
}
