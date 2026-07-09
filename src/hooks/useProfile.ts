import { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Profile {
  id?: string
  name?: string | null
  height_inches?: number | null
  gender?: 'male' | 'female' | null
  target_weight?: number | null
  target_body_fat?: number | null
  target_ffmi?: number | null
  target_normalized_ffmi?: number | null
  goal_start_date?: string | null
  hide_pre_goal_entries?: boolean | null
  created_at?: string
  updated_at?: string
}

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    const userId = user?.id
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (user?.id !== userId) {
      setLoading(false)
      return
    }

    if (!error) {
      setProfile(data)
    } else if (error.code === 'PGRST116') {
      setProfile(null)
    } else {
      console.error('Error fetching profile:', error)
    }

    setLoading(false)
  }, [user?.id])

  useLayoutEffect(() => {
    if (!user?.id) {
      setProfile(null)
      setLoading(false)
      return
    }

    setProfile(null)
    setLoading(true)
  }, [user?.id])

  const refetchProfile = fetchProfile

  useEffect(() => {
    const userId = user?.id

    if (!userId) {
      return
    }

    let cancelled = false

    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (cancelled) return

      if (!error) {
        setProfile(data)
      } else if (error.code === 'PGRST116') {
        setProfile(null)
      } else {
        console.error('Error fetching profile:', error)
      }

      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  return {
    profile,
    loading,
    refetchProfile,
  }
}
