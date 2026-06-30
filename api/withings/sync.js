import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function round1(n) {
  return parseFloat(n.toFixed(1))
}

function rowToAggregate(row) {
  const log_count = row.log_count ?? 1
  const body_fat_log_count =
    row.body_fat_log_count ?? (row.body_fat != null ? log_count : 0)
  return {
    weight: row.weight,
    body_fat: row.body_fat,
    log_count,
    body_fat_log_count,
  }
}

function readingToAggregate(weight, bodyFat) {
  const hasBf = bodyFat != null
  return {
    weight,
    body_fat: bodyFat,
    log_count: 1,
    body_fat_log_count: hasBf ? 1 : 0,
  }
}

function mergeAggregates(existing, incoming) {
  if (!existing) {
    return {
      weight: round1(incoming.weight),
      body_fat: incoming.body_fat != null ? round1(incoming.body_fat) : null,
      log_count: incoming.log_count,
      body_fat_log_count: incoming.body_fat_log_count,
    }
  }

  const log_count = existing.log_count + incoming.log_count
  const weight = round1(
    (existing.weight * existing.log_count + incoming.weight * incoming.log_count) / log_count
  )

  const body_fat_log_count = existing.body_fat_log_count + incoming.body_fat_log_count
  let body_fat = null

  if (body_fat_log_count > 0) {
    const existingSum = (existing.body_fat ?? 0) * existing.body_fat_log_count
    const incomingSum = (incoming.body_fat ?? 0) * incoming.body_fat_log_count
    body_fat = round1((existingSum + incomingSum) / body_fat_log_count)
  }

  return { weight, body_fat, log_count, body_fat_log_count }
}

function parseBody(req) {
  try {
    if (!req.body) return {}
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return {}
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })

  const token = authHeader.split(' ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) return res.status(401).json({ error: 'Invalid user' })

  const { force = false } = parseBody(req)

  const { data: tokenData } = await supabase
    .from('withings_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!tokenData?.access_token) {
    return res.status(400).json({ error: 'Withings not connected' })
  }

  if (force) {
    await supabase
      .from('withings_synced_grpids')
      .delete()
      .eq('user_id', user.id)
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
    let newReadingsMerged = 0
    let skippedAlreadySynced = 0
    let skippedNoData = 0
    let skippedNoWeight = 0
    const daysUpdated = new Set()
    const errors = []

    for (const group of groups) {
      const loggedAt = new Date(group.date * 1000).toISOString()
      const date = loggedAt.split('T')[0]
      let weightKg = null
      let bodyFat = null

      for (const m of group.measures) {
        const realValue = m.value * Math.pow(10, m.unit)
        if (m.type === 1) weightKg = realValue
        if (m.type === 6) bodyFat = realValue
      }

      if (!weightKg && bodyFat == null) {
        skippedNoData++
        continue
      }

      if (!force) {
        const { data: alreadySynced } = await supabase
          .from('withings_synced_grpids')
          .select('grpid')
          .eq('user_id', user.id)
          .eq('grpid', group.grpid)
          .maybeSingle()

        if (alreadySynced) {
          skippedAlreadySynced++
          continue
        }
      }

      const { data: existing } = await supabase
        .from('measurements')
        .select('weight, body_fat, log_count, body_fat_log_count')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle()

      const weightLbs = weightKg
        ? weightKg * 2.20462
        : existing?.weight ?? null

      if (weightLbs == null) {
        skippedNoWeight++
        continue
      }

      const merged = mergeAggregates(
        existing ? rowToAggregate(existing) : null,
        readingToAggregate(weightLbs, bodyFat)
      )

      const { error: upsertError } = await supabase.from('measurements').upsert(
        {
          user_id: user.id,
          date,
          weight: merged.weight,
          body_fat: merged.body_fat,
          log_count: merged.log_count,
          body_fat_log_count: merged.body_fat_log_count,
          logged_at: loggedAt,
        },
        { onConflict: 'user_id,date' }
      )

      if (upsertError) {
        errors.push({ date, message: upsertError.message })
        continue
      }

      const { error: trackError } = await supabase
        .from('withings_synced_grpids')
        .insert({ user_id: user.id, grpid: group.grpid })

      if (trackError && trackError.code !== '23505') {
        errors.push({ date, message: trackError.message })
        continue
      }

      newReadingsMerged++
      daysUpdated.add(date)
    }

    return res.status(200).json({
      success: true,
      found: groups.length,
      newReadingsMerged,
      daysUpdated: daysUpdated.size,
      skippedAlreadySynced,
      skippedNoData,
      skippedNoWeight,
      force,
      errors: errors.slice(0, 5),
      message: force
        ? `Full re-sync: merged ${newReadingsMerged} Withings logs across ${daysUpdated.size} days.`
        : `Merged ${newReadingsMerged} new Withings logs across ${daysUpdated.size} days.`,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Sync failed', details: error.message })
  }
}