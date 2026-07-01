import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { upsertDailyMeasurement } from '../lib/upsertDailyMeasurement'
import { useAuth } from '../contexts/AuthContext'

export interface Measurement {
  id: string
  user_id: string
  date: string
  logged_at?: string | null
  weight: number
  body_fat: number | null
  log_count?: number
  body_fat_log_count?: number
  height_inches: number | null
  gender: "male" | "female" | null
  created_at: string
}

export function useMeasurements() {
  const { user } = useAuth()
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMeasurements = async () => {
    const userId = user?.id
    if (!userId) {
      setMeasurements([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (user?.id !== userId) return

    if (!error && data) {
      setMeasurements(data)
    }
    setLoading(false)
  }

  const addMeasurement = async (
    date: string,
    weight: number,
    body_fat: number | null = null
  ) => {
    if (!user) return { error: 'No user' }

    const { error } = await upsertDailyMeasurement(supabase, user.id, date, {
      weight,
      body_fat,
    })

    if (error) {
      return { error }
    }

    fetchMeasurements().catch(console.error)
    return { error: null }
  }

  const deleteMeasurement = async (id: string) => {
    const { error } = await supabase.from('measurements').delete().eq('id', id)

    if (!error) {
      await fetchMeasurements()
    }
    return { error }
  }

  useEffect(() => {
    const userId = user?.id

    if (!userId) {
      setMeasurements([])
      setLoading(false)
      return
    }

    setMeasurements([])
    setLoading(true)

    let cancelled = false

    ;(async () => {
      const { data, error } = await supabase
        .from('measurements')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (cancelled) return

      if (!error && data) {
        setMeasurements(data)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  return {
    measurements,
    loading,
    addMeasurement,
    deleteMeasurement,
    refetch: fetchMeasurements,
  }
}