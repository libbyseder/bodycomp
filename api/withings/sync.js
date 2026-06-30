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

  // Get stored Withings tokens
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
    // Pull last ~2 years of data
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
      }),
    })

    const data = await response.json()

    if (data.status !== 0) {
      return res.status(400).json({ error: 'Withings error', details: data })
    }

    const groups = data.body?.measuregrps || []
    let imported = 0
    const errors = []

    for (const group of groups) {
      const date = new Date(group.date * 1000).toISOString().split('T')[0]
      let weightKg = null
      let bodyFat = null

      for (const m of group.measures) {
        const realValue = m.value * Math.pow(10, m.unit)   // correct conversion
        if (m.type === 1) weightKg = realValue
        if (m.type === 6) bodyFat = realValue
      }

      // Insert if we have weight OR body fat (more inclusive)
      if (weightKg || bodyFat) {
        const weightLbs = weightKg ? weightKg * 2.20462 : null

        const { error } = await supabase.from('measurements').insert({
          user_id: user.id,
          date,
          weight: weightLbs,
          body_fat: bodyFat,
        })

        if (error) {
          errors.push({ date, message: error.message })
        } else {
          imported++
        }
      }
    }

    return res.status(200).json({
      success: true,
      found: groups.length,
      imported,
      errors: errors.slice(0, 5),
      message: `Found ${groups.length} records from Withings. Imported ${imported} new measurements.`,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Sync failed', details: error.message })
  }
}
