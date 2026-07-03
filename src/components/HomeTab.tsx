import type { Measurement, Profile } from '../types'
import DashboardWidgets from './DashboardWidgets'
import SmoothedTrendsChart from './SmoothedTrendsChart'
import GoalPredictionBanner from './GoalPredictionBanner'
import MeasurementTimeline from './MeasurementTimeline'
import { Link2 } from 'lucide-react'

interface HomeTabProps {
  measurements: Measurement[]
  profile: Profile | null
  withingsConnected: boolean
  onNavigateToLog: () => void
  onNavigateToSettings: () => void
  onNavigateToTrends: () => void
}

export default function HomeTab({
  measurements,
  profile,
  withingsConnected,
  onNavigateToLog,
  onNavigateToSettings,
  onNavigateToTrends,
}: HomeTabProps) {
  return (
    <div>
      {!withingsConnected && (
        <button
          type="button"
          onClick={onNavigateToSettings}
          className="w-full mb-6 flex items-center gap-3 p-4 bg-blue-600/10 border border-blue-600/30 rounded-2xl text-left hover:bg-blue-600/15 transition-colors"
        >
          <Link2 size={20} className="text-blue-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-300">Connect Withings</p>
            <p className="text-xs text-zinc-400 mt-0.5">Sync your scale automatically in Settings</p>
          </div>
        </button>
      )}

      <DashboardWidgets measurements={measurements} profile={profile} />
      <GoalPredictionBanner measurements={measurements} profile={profile} />

      <SmoothedTrendsChart
        measurements={measurements}
        profile={profile}
        title="Goal Path"
        subtitle="Smoothed trends toward your goals"
        className="mb-6"
      />

      <div className="mb-2">
        <button
          type="button"
          onClick={onNavigateToTrends}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Explore full trends →
        </button>
      </div>

      <MeasurementTimeline
        measurements={measurements}
        profile={profile}
        onViewAll={onNavigateToLog}
      />
    </div>
  )
}