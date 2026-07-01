import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { apiUrl } from './lib/apiBase'
import { registerWithingsDeepLinkHandler } from './lib/withingsOAuth'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthModal from './components/AuthModal'
import QuickLogModal from './components/QuickLogModal'
import ProfileModal from './components/ProfileModal'
import DashboardWidgets from './components/DashboardWidgets'
import TrendsChart from './components/TrendsChart'
import SmoothedTrendsChart from './components/SmoothedTrendsChart'
import ImportCSV from './components/ImportCSV'
import DashboardHeader from './components/DashboardHeader'
import InstallPrompt from './components/InstallPrompt'
import MeasurementsTable from './components/MeasurementsTable'
import { useMeasurements } from './hooks/useMeasurements'
import { useProfile } from './hooks/useProfile'
import { useWithingsConnection } from './hooks/useWithingsConnection'
import toast, { Toaster } from 'react-hot-toast'
import { Plus, RefreshCw } from 'lucide-react'

function Dashboard() {
  const { user, signOut } = useAuth()
  const { measurements, deleteMeasurement, refetch } = useMeasurements()
  const { profile, refetchProfile } = useProfile()
  const { connected: withingsConnected, loading: withingsLoading, refetch: refetchWithings } = useWithingsConnection()

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    setShowProfile(false)
    setShowQuickLog(false)
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
        toast.success('Withings connected successfully!')
        await refetchWithings()
      } else {
        toast.error('Failed to save Withings connection')
        console.error(result)
      }
    } catch (error) {
      console.error('Error saving Withings tokens:', error)
      toast.error('Something went wrong while connecting Withings')
    }
  }, [refetchWithings])

  // Web OAuth return (browser redirect with query params)
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

  // iOS OAuth return (custom URL scheme deep link)
  useEffect(() => {
    return registerWithingsDeepLinkHandler(saveWithingsTokens)
  }, [saveWithingsTokens])

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete ALL your measurements? This cannot be undone.")) {
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Please log in first")
        return
      }
      const response = await fetch(apiUrl('/api/delete-all'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Delete failed')
      toast.success("All measurements deleted (Withings sync history reset)")
      await refetch()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete measurements")
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tighter mb-4">RecompTrack</h1>
          <p className="text-base sm:text-xl text-zinc-400 mb-8">Track your body composition with precision.</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-medium"
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
      <div className="max-w-5xl mx-auto px-4 py-5 sm:px-6 sm:py-6">
        <DashboardHeader
          refetch={refetch}
          onProfile={() => setShowProfile(true)}
          onSignOut={signOut}
          withingsConnected={withingsConnected}
          withingsLoading={withingsLoading}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tighter">Dashboard</h1>
            <p className="text-zinc-400 mt-1 text-sm sm:text-base">Track your progress over time</p>
          </div>
          <button
            onClick={() => setShowQuickLog(true)}
            className="flex items-center justify-center gap-x-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-medium transition-colors w-full sm:w-auto shrink-0"
          >
            <Plus size={18} /> Quick Log
          </button>
        </div>

        <DashboardWidgets measurements={measurements} profile={profile} />
        <SmoothedTrendsChart measurements={measurements} profile={profile} />
        <TrendsChart measurements={measurements} profile={profile} />

        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-xl sm:text-2xl font-semibold">Measurements</h2>
              <span className="text-sm text-zinc-400">{measurements.length} total entries</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
              <ImportCSV refetch={refetch} />
              <button
                onClick={handleDeleteAll}
                className="flex items-center justify-center gap-x-2 px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm transition-colors w-full sm:w-auto"
              >
                Delete All
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-x-2 px-3 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-sm transition-colors w-full sm:w-auto"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          <MeasurementsTable
            measurements={measurements}
            onDelete={deleteMeasurement}
            profile={profile}
          />
        </div>
      </div>

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
