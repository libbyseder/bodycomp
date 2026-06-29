import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthModal from './components/AuthModal'
import QuickLogModal from './components/QuickLogModal'
import ProfileModal from './components/ProfileModal'
import DashboardWidgets from './components/DashboardWidgets'
import TrendsChart from './components/TrendsChart'
import ImportCSV from './components/ImportCSV'
import MeasurementsTable from './components/MeasurementsTable'
import { useMeasurements } from './hooks/useMeasurements'
import { useProfile } from './hooks/useProfile'
import toast from 'react-hot-toast'
import { LogOut, Plus, RefreshCw } from 'lucide-react'

function Dashboard() {
  const { user, signOut } = useAuth()
  const { measurements, deleteMeasurement, refetch } = useMeasurements()
  const { profile } = useProfile()

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  // ===================== WITHINGS INTEGRATION =====================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get('withings_success') === 'true') {
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      const withings_user_id = params.get('withings_user_id')

      if (access_token && refresh_token && withings_user_id) {
        saveWithingsTokens(access_token, refresh_token, withings_user_id)
      }

      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const saveWithingsTokens = async (
    access_token: string,
    refresh_token: string,
    withings_user_id: string
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert("Please log in to connect Withings")
        return
      }

      const response = await fetch('/api/withings/save-tokens', {
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
        alert("Withings connected successfully!")
      } else {
        alert("Failed to save Withings connection")
        console.error(result)
      }
    } catch (error) {
      console.error("Error saving Withings tokens:", error)
      alert("Something went wrong while connecting Withings")
    }
  }
  // ===================== END WITHINGS =====================

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete ALL your measurements? This cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase
        .from('measurements')
        .delete()
        .eq('user_id', user?.id)

      if (error) throw error

      toast.success("All measurements deleted")
      await refetch()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete measurements")
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-semibold tracking-tighter mb-4">RecompTrack</h1>
          <p className="text-xl text-zinc-400 mb-8">Track your body composition with precision.</p>
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
      <div className="max-w-5xl mx-auto p-6">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-x-3">
            <div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center">
              <span className="text-white text-2xl">🏋️</span>
            </div>
            <div>
              <span className="font-semibold text-3xl tracking-tighter">RecompTrack</span>
              <span className="text-emerald-400 text-xs block -mt-1.5">FFMI + BODY RECOMP</span>
            </div>
          </div>

          <div className="flex items-center gap-x-3">
            <ImportCSV refetch={refetch} />

            <button
              onClick={() => window.location.href = '/api/withings/auth'}
              className="flex items-center gap-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-2xl text-sm transition-colors"
            >
              Connect Withings
            </button>

            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm transition-colors"
            >
              Profile
            </button>

            <button
              onClick={signOut}
              className="flex items-center gap-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm transition-colors"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </header>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-5xl font-semibold tracking-tighter">Dashboard</h1>
            <p className="text-zinc-400 mt-1">Track your progress over time</p>
          </div>
          <button
            onClick={() => setShowQuickLog(true)}
            className="flex items-center gap-x-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-medium transition-colors"
          >
            <Plus size={18} /> Quick Log
          </button>
        </div>

        <DashboardWidgets measurements={measurements} />
        <TrendsChart measurements={measurements} profile={profile} />

        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Measurements</h2>
            <div className="flex items-center gap-x-3">
              <span className="text-sm text-zinc-400">{measurements.length} total entries</span>
              <ImportCSV refetch={refetch} />
              <button
                onClick={handleDeleteAll}
                className="flex items-center gap-x-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm transition-colors"
              >
                Delete All
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-x-2 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-sm transition-colors"
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

      <QuickLogModal isOpen={showQuickLog} onClose={() => setShowQuickLog(false)} refetch={refetch} />
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  )
}

export default App
