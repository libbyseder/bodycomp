import { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { ProgressPhoto } from '../types'

export function useProgressPhotos() {
  const { user } = useAuth()
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPhotos = useCallback(async () => {
    const userId = user?.id
    if (!userId) {
      setPhotos([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (user?.id !== userId) {
      setLoading(false)
      return
    }

    if (error) {
      console.error('Error fetching progress photos:', error)
    } else if (data) {
      setPhotos(data as ProgressPhoto[])
    }

    setLoading(false)
  }, [user?.id])

  useLayoutEffect(() => {
    if (!user?.id) {
      setPhotos([])
      setLoading(false)
      return
    }

    setPhotos([])
    setLoading(true)
  }, [user?.id])

  useEffect(() => {
    void fetchPhotos()
  }, [fetchPhotos])

  return {
    photos,
    loading,
    refetch: fetchPhotos,
  }
}