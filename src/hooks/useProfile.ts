import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

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
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (new user)
      console.error('Error fetching profile:', error)
    }

    setProfile(data || null)
    setLoading(false)
  }, [user])

  const updateProfile = async (updates: Partial<Omit<Profile, 'id' | 'updated_at'>>) => {
    if (!user) return { error: 'No user' }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to save profile')
      console.error(error)
      return { error }
    }

    setProfile(data)
    toast.success('Profile saved!')
    return { data }
  }

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    loading,
    updateProfile,
    refresh: fetchProfile,
  }
}
