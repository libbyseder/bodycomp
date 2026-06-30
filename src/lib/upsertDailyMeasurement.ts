import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeAggregates, readingToAggregate, rowToAggregate } from './mergeMeasurement'

export async function upsertDailyMeasurement(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  reading: { weight: number; body_fat: number | null }
) {
  const { data: existing, error: fetchError } = await supabase
    .from('measurements')
    .select('weight, body_fat, log_count, body_fat_log_count')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError, merged: null }
  }

  const merged = mergeAggregates(
    existing ? rowToAggregate(existing) : null,
    readingToAggregate(reading)
  )

  const { error } = await supabase.from('measurements').upsert(
    {
      user_id: userId,
      date,
      weight: merged.weight,
      body_fat: merged.body_fat,
      log_count: merged.log_count,
      body_fat_log_count: merged.body_fat_log_count,
      logged_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date' }
  )

  return { error, merged }
}

export async function upsertDailyAggregate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  aggregate: ReturnType<typeof readingToAggregate>
) {
  const { data: existing, error: fetchError } = await supabase
    .from('measurements')
    .select('weight, body_fat, log_count, body_fat_log_count')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError, merged: null }
  }

  const merged = mergeAggregates(
    existing ? rowToAggregate(existing) : null,
    aggregate
  )

  const { error } = await supabase.from('measurements').upsert(
    {
      user_id: userId,
      date,
      weight: merged.weight,
      body_fat: merged.body_fat,
      log_count: merged.log_count,
      body_fat_log_count: merged.body_fat_log_count,
      logged_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date' }
  )

  return { error, merged }
}