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

  // Get Withings tokens
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
    // Pull last 2 years of data (change this if needed)
    const startDate = Math.floor(Date.now() / 1000) - (2 * 365 * 24 * 60 * 60)

    const response = await fetch('https://wbsapi.withings.net/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'getmeas',
        access_token,
        meastype: '1,6',        // 1 = Weight, 6 = Body Fat %
        category: '1',
        startdate: startDate,
        offset: '0',
      }),
    })

    const data = await response.json()

    if (data.status !== 0) {
      return res.status(400).json({ error: 'Failed to fetch from Withings', details: data })
    }

    const groups = data.body?.measuregrps || []
    let imported = 0
    let skipped = 0

    for (const group of groups) {
      const date = new Date(group.date * 1000).toISOString().split('T')[0]
      let weightKg = null
      let bodyFat = null

      for (const m of group.measures) {
        if (m.type === 1) weightKg = m.value / Math.pow(10, m.unit)
        if (m.type === 6) bodyFat = m.value / Math.pow(10, m.unit)
      }

      if (weightKg) {
        const weightLbs = weightKg * 2.20462

        const { error } = await supabase
          .from('measurements')
          .upsert({
            user_id: user.id,
            date,
            weight: weightLbs,
            body_fat: bodyFat,
          }, {
            onConflict: 'user_id,date'
          })

        if (error) {
          console.error('Insert error:', error)
          skipped++
        } else {
          imported++
        }
      }
    }

    return res.status(200).json({
      success: true,
      imported,
      skipped,
      totalFromWithings: groups.length,
      message: `Imported ${imported} new measurements from Withings`,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Sync failed', details: error.message })
  }
}
