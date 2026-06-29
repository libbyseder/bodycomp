import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Measurement {
  id: string
  user_id: string
  date: string
  weight: number
  body_fat: number | null
  height_inches?: number | null
  gender?: "male" | "female" | null
  created_at?: string
}

export function useMeasurements() {
  const { user } = useAuth()
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMeasurements = async () => {
    if (!user) return
    setLoading(true)

    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

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

    const { data, error } = await supabase
      .from('measurements')
      .insert({
        user_id: user.id,
        date,
        weight,
        body_fat,
      })
      .select()
      .single()

    if (!error) {
      await fetchMeasurements() // Auto refresh after adding
    }

    return { data, error }
  }

  const deleteMeasurement = async (id: string) => {
    const { error } = await supabase.from('measurements').delete().eq('id', id)

    if (!error) {
      await fetchMeasurements() // Auto refresh after deleting
    }

    return { error }
  }

  useEffect(() => {
    fetchMeasurements()
  }, [user?.id])

  return {
    measurements,
    loading,
    addMeasurement,
    deleteMeasurement,
    refetch: fetchMeasurements,
  }
}
