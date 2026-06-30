import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Profile {
  id?: string
  user_id: string
  name?: string | null
  height_inches?: number | null
  gender?: 'male' | 'female' | null
  target_weight?: number | null
  target_body_fat?: number | null
  target_ffmi?: number | null
  created_at?: string
  updated_at?: string
}

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!error) {
      setProfile(data)
    } else if (error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
    }

    setLoading(false)
  }, [user?.id])

  const refetchProfile = fetchProfile

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    loading,
    refetchProfile,
  }
}
