import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useWithingsConnection() {
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) {
      setConnected(false)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setConnected(false)
        return
      }

      const response = await fetch('/api/withings/status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!response.ok) {
        setConnected(false)
        return
      }

      const result = await response.json()
      setConnected(!!result.connected)
    } catch (err) {
      console.error('Error checking Withings connection:', err)
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { connected, loading, refetch }
}