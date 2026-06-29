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
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.split(' ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) {
    return res.status(401).json({ error: 'Invalid user' })
  }

  // Get stored Withings tokens
  const { data: tokenData } = await supabase
    .from('withings_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!tokenData) {
    return res.status(400).json({ error: 'Withings not connected' })
  }

  const { access_token } = tokenData

  try {
    // Fetch last 90 days of data from Withings
    const startDate = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60)

    const measureResponse = await fetch('https://wbsapi.withings.net/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'getmeas',
        access_token,
        meastype: '1,6',           // 1 = Weight, 6 = Fat Ratio
        category: '1',
        startdate: startDate,
        offset: '0',
      }),
    })

    const measureData = await measureResponse.json()

    if (measureData.status !== 0) {
      return res.status(400).json({ error: 'Failed to fetch Withings data', details: measureData })
    }

    const measures = measureData.body.measuregrps || []
    let imported = 0

    for (const group of measures) {
      const date = new Date(group.date * 1000).toISOString().split('T')[0]
      let weight = null
      let body_fat = null

      for (const m of group.measures) {
        if (m.type === 1) weight = m.value / Math.pow(10, m.unit) // Weight in kg → convert if needed
        if (m.type === 6) body_fat = m.value / Math.pow(10, m.unit)
      }

      if (weight) {
        // Insert into measurements (avoid duplicates)
        const { error } = await supabase.from('measurements').upsert({
          user_id: user.id,
          date,
          weight: weight * 2.20462, // Convert kg to lbs
          body_fat: body_fat,
        }, { onConflict: 'user_id,date' })

        if (!error) imported++
      }
    }

    return res.status(200).json({
      success: true,
      imported,
      message: `Imported ${imported} measurements from Withings`,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Sync failed' })
  }
}
