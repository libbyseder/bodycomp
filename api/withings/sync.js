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

  const { data: tokenData } = await supabase
    .from('withings_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!tokenData?.access_token) {
    return res.status(400).json({ error: 'Withings not connected' })
  }

  const { access_token } = tokenData

  try {
    const startDate = Math.floor(Date.now() / 1000) - (2 * 365 * 24 * 60 * 60)

    const response = await fetch('https://wbsapi.withings.net/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'getmeas',
        access_token,
        meastype: '1,6',
        category: '1',
        startdate: startDate,
      }),
    })

    const data = await response.json()

    if (data.status !== 0) {
      return res.status(400).json({ error: 'Withings error', details: data })
    }

    const groups = data.body?.measuregrps || []
    let firstError = null
    let imported = 0

    for (const group of groups) {
      const date = new Date(group.date * 1000).toISOString().split('T')[0]
      let weightKg = null
      let bodyFat = null

      for (const m of group.measures) {
        if (m.type === 1) weightKg = m.value / Math.pow(10, m.unit)
        if (m.type === 6) bodyFat = m.value / Math.pow(10, m.unit)
      }

      if (weightKg && !firstError) {
        const weightLbs = weightKg * 2.20462

        const { error } = await supabase.from('measurements').insert({
          user_id: user.id,
          date,
          weight: weightLbs,
          body_fat: bodyFat,
        })

        if (error) {
          firstError = { date, error: error.message, code: error.code }
        } else {
          imported++
        }
      }
    }

    return res.status(200).json({
      success: true,
      found: groups.length,
      imported,
      firstError, // ← This will show us the real problem
      message: firstError 
        ? `Error on ${firstError.date}: ${firstError.error}` 
        : `Imported ${imported} measurements`,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Sync failed', details: error.message })
  }
}
