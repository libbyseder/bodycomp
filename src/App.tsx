import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { apiUrl } from './lib/apiBase'
import { registerWithingsDeepLinkHandler } from './lib/withingsOAuth'
import { registerAuthDeepLinkHandler } from './lib/oauthSignIn'
import { runWithingsSync } from './lib/runWithingsSync'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthModal from './components/AuthModal'
import QuickLogModal from './components/QuickLogModal'
import ProfileModal from './components/ProfileModal'
import DashboardHeader from './components/DashboardHeader'
import InstallPrompt from './components/InstallPrompt'
import BodyTrendBrand from './components/BodyTrendBrand'
import BottomTabBar from './components/BottomTabBar'
import QuickLogFab from './components/QuickLogFab'
import HomeTab from './components/HomeTab'
import TrendsTab from './components/TrendsTab'
import LogTab from './components/LogTab'
import SettingsTab from './components/SettingsTab'
import { useMeasurements } from './hooks/useMeasurements'
import { useProfile } from './hooks/useProfile'
import { useWithingsConnection } from './hooks/useWithingsConnection'
import type { TabId } from './types/navigation'
import toast, { Toaster } from 'react-hot-toast'

function Dashboard() {
  const { user, signOut } = useAuth()
  const { measurements, deleteMeasurement, refetch } = useMeasurements()
  const { profile, refetchProfile } = useProfile()
  const { connected: withingsConnected, loading: withingsLoading, refetch: refetchWithings } = useWithingsConnection()

  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    setShowProfile(false)
    setShowQuickLog(false)
    setActiveTab('home')
  }, [user?.id])

  const saveWithingsTokens = useCallback(async (
    access_token: string,
    refresh_token: string,
    withings_user_id: string
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please log in to connect Withings')
        return
      }
      const response = await fetch(apiUrl('/api/withings/save-tokens'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          access_token,
          refresh_token,
          withings_user_id,
        }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success('Withings connected — importing your scale history…')
        await refetchWithings()
        setActiveTab('settings')

        const syncResult = await runWithingsSync(false)
        if (syncResult.ok) {
          toast.success(syncResult.message || 'Withings history imported!')
          await refetch()
        } else {
          toast.error(syncResult.error || 'Connected, but the first sync failed. Tap Sync Now to retry.')
        }
      } else {
        toast.error('Failed to save Withings connection')
        console.error(result)
      }
    } catch (error) {
      console.error('Error saving Withings tokens:', error)
      toast.error('Something went wrong while connecting Withings')
    }
  }, [refetchWithings, refetch])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('withings_success') === 'true') {
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      const withings_user_id = params.get('withings_user_id')
      if (access_token && refresh_token && withings_user_id) {
        void saveWithingsTokens(access_token, refresh_token, withings_user_id)
      }
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [saveWithingsTokens])

  useEffect(() => {
    return registerWithingsDeepLinkHandler(saveWithingsTokens)
  }, [saveWithingsTokens])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authError = params.get('error_description') || params.get('error')
    if (authError) {
      toast.error(decodeURIComponent(authError.replace(/\+/g, ' ')))
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  useEffect(() => {
    return registerAuthDeepLinkHandler(
      () => toast.success('Signed in successfully!'),
      (message) => toast.error(message)
    )
  }, [])

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete ALL your measurements? This cannot be undone.')) {
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please log in first')
        return
      }
      const response = await fetch(apiUrl('/api/delete-all'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Delete failed')
      toast.success('All measurements deleted (Withings sync history reset)')
      await refetch()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete measurements')
    }
  }

  const showFab = activeTab === 'home' || activeTab === 'log'

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center px-4">
        <div className="text-center max-w-lg flex flex-col items-center">
          <BodyTrendBrand className="mb-8 justify-center" />
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-2xl font-medium"
          >
            Get Started
          </button>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-5xl mx-auto px-4 pt-5 sm:px-6 sm:pt-6 pb-tab-bar">
        <DashboardHeader
          withingsConnected={withingsConnected}
          withingsLoading={withingsLoading}
          measurementCount={measurements.length}
          onOpenSettings={() => setActiveTab('settings')}
        />

        {activeTab === 'home' && (
          <HomeTab
            measurements={measurements}
            profile={profile}
            withingsConnected={withingsConnected}
            onNavigateToLog={() => setActiveTab('log')}
            onNavigateToSettings={() => setActiveTab('settings')}
            onNavigateToTrends={() => setActiveTab('trends')}
          />
        )}

        {activeTab === 'trends' && (
          <TrendsTab measurements={measurements} profile={profile} />
        )}

        {activeTab === 'log' && (
          <LogTab
            measurements={measurements}
            profile={profile}
            onDelete={deleteMeasurement}
            onRefresh={refetch}
            onQuickLog={() => setShowQuickLog(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            refetch={refetch}
            measurementCount={measurements.length}
            onProfile={() => setShowProfile(true)}
            onSignOut={signOut}
            onDeleteAll={() => void handleDeleteAll()}
            withingsConnected={withingsConnected}
            withingsLoading={withingsLoading}
          />
        )}
      </div>

      {showFab && <QuickLogFab onClick={() => setShowQuickLog(true)} />}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <QuickLogModal
        isOpen={showQuickLog}
        onClose={() => setShowQuickLog(false)}
        refetch={refetch}
      />
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        onSave={refetchProfile}
      />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#27272a',
            color: '#fafafa',
            border: '1px solid #3f3f46',
          },
        }}
      />
      <Dashboard />
      <InstallPrompt />
    </AuthProvider>
  )
}

export default App