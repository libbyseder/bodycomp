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

function parseGroup(group) {
  let weightKg = null
  let bodyFat = null

  for (const m of group.measures || []) {
    const realValue = m.value * Math.pow(10, m.unit)
    if (m.type === 1) weightKg = realValue
    if (m.type === 6) bodyFat = realValue
  }

  return {
    grpid: group.grpid,
    date: new Date(group.date * 1000).toISOString().split('T')[0],
    loggedAt: new Date(group.date * 1000).toISOString(),
    weightKg,
    bodyFat,
    hasWeight: weightKg != null,
  }
}

async function fetchAllMeasureGroups(accessToken, startDate) {
  const allGroups = []
  let offset = 0

  for (let page = 0; page < 50; page++) {
    const params = new URLSearchParams({
      action: 'getmeas',
      access_token: accessToken,
      meastype: '1,6',
      category: '1',
      startdate: String(startDate),
    })
    if (offset > 0) params.set('offset', String(offset))

    const response = await fetch('https://wbsapi.withings.net/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    const data = await response.json()
    if (data.status !== 0) {
      throw new Error(data.error || `Withings API status ${data.status}`)
    }

    const grps = data.body?.measuregrps || []
    allGroups.push(...grps)

    if (data.body?.more !== 1) break
    offset = data.body?.offset ?? 0
  }

  return allGroups
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

  try {
    // 10 years of history
    const startDate = Math.floor(Date.now() / 1000) - (10 * 365 * 24 * 60 * 60)
    const allGroups = await fetchAllMeasureGroups(tokenData.access_token, startDate)

    // Load existing synced grpids once (not per-reading queries)
    const syncedGrpids = new Set()
    if (!force) {
      const { data: synced } = await supabase
        .from('withings_synced_grpids')
        .select('grpid')
        .eq('user_id', user.id)
      for (const row of synced || []) {
        syncedGrpids.add(row.grpid)
      }
    }

    // Load existing daily rows once
    const { data: existingRows } = await supabase
      .from('measurements')
      .select('date, weight, body_fat, log_count, body_fat_log_count')
      .eq('user_id', user.id)

    const byDate = new Map()
    const lastLoggedAt = new Map()

    for (const row of existingRows || []) {
      byDate.set(row.date, rowToAggregate(row))
    }

    let skippedAlreadySynced = 0
    let skippedNoData = 0
    let skippedNoWeight = 0
    let newReadingsMerged = 0
    const newGrpids = []

    // Process weight readings before body-fat-only on the same day
    const parsed = allGroups.map(parseGroup)
    parsed.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      if (a.hasWeight !== b.hasWeight) return a.hasWeight ? -1 : 1
      return 0
    })

    for (const reading of parsed) {
      if (!reading.hasWeight && reading.bodyFat == null) {
        skippedNoData++
        continue
      }

      if (!force && syncedGrpids.has(reading.grpid)) {
        skippedAlreadySynced++
        continue
      }

      const existing = byDate.get(reading.date)
      const weightLbs = reading.weightKg
        ? reading.weightKg * 2.20462
        : existing?.weight ?? null

      if (weightLbs == null) {
        skippedNoWeight++
        continue
      }

      const merged = mergeAggregates(
        existing ?? null,
        readingToAggregate(weightLbs, reading.bodyFat)
      )

      byDate.set(reading.date, merged)
      lastLoggedAt.set(reading.date, reading.loggedAt)
      newGrpids.push(reading.grpid)
      syncedGrpids.add(reading.grpid)
      newReadingsMerged++
    }

    // Batch upsert only days that received new Withings data this run
    const toUpsert = []
    for (const [date, agg] of byDate.entries()) {
      if (!lastLoggedAt.has(date)) continue
      toUpsert.push({
        user_id: user.id,
        date,
        weight: agg.weight,
        body_fat: agg.body_fat,
        log_count: agg.log_count,
        body_fat_log_count: agg.body_fat_log_count,
        logged_at: lastLoggedAt.get(date),
      })
    }

    const BATCH = 200
    const errors = []
    for (let i = 0; i < toUpsert.length; i += BATCH) {
      const batch = toUpsert.slice(i, i + BATCH)
      const { error } = await supabase
        .from('measurements')
        .upsert(batch, { onConflict: 'user_id,date' })
      if (error) errors.push({ message: error.message })
    }

    // Batch insert grpids
    for (let i = 0; i < newGrpids.length; i += BATCH) {
      const batch = newGrpids.slice(i, i + BATCH).map((grpid) => ({
        user_id: user.id,
        grpid,
      }))
      await supabase.from('withings_synced_grpids').upsert(batch, {
        onConflict: 'user_id,grpid',
      })
    }

    const daysUpdated = lastLoggedAt.size

    return res.status(200).json({
      success: true,
      found: allGroups.length,
      newReadingsMerged,
      daysUpdated,
      skippedAlreadySynced,
      skippedNoData,
      skippedNoWeight,
      force,
      errors: errors.slice(0, 5),
      message:
        `Fetched ${allGroups.length} Withings readings. ` +
        `Merged ${newReadingsMerged} logs across ${daysUpdated} day${daysUpdated === 1 ? '' : 's'}.`,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Sync failed', details: error.message })
  }
}