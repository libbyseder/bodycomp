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

  const { error: measurementsError } = await supabase
    .from('measurements')
    .delete()
    .eq('user_id', user.id)

  if (measurementsError) {
    return res.status(500).json({ error: measurementsError.message })
  }

  // Reset Withings dedup so Sync Now re-imports everything
  await supabase
    .from('withings_synced_grpids')
    .delete()
    .eq('user_id', user.id)

  return res.status(200).json({ success: true })
}