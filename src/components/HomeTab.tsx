import type { Measurement, Profile } from '../types'
import { needsSetup } from '../lib/profileSetup'
import DashboardWidgets from './DashboardWidgets'
import SmoothedTrendsChart from './SmoothedTrendsChart'
import GoalPredictionBanner from './GoalPredictionBanner'
import MeasurementTimeline from './MeasurementTimeline'
import SetupChecklist from './SetupChecklist'

interface HomeTabProps {
  measurements: Measurement[]
  profile: Profile | null
  profileLoading: boolean
  measurementsLoading: boolean
  withingsConnected: boolean
  onOpenProfile: () => void
  onNavigateToLog: () => void
  onNavigateToSettings: () => void
  onNavigateToTrends: () => void
}

export default function HomeTab({
  measurements,
  profile,
  profileLoading,
  measurementsLoading,
  withingsConnected,
  onOpenProfile,
  onNavigateToLog,
  onNavigateToSettings,
  onNavigateToTrends,
}: HomeTabProps) {
  const showSetup = needsSetup(
    profile,
    measurements.length,
    profileLoading,
    measurementsLoading
  )

  return (
    <div>
      {showSetup && (
        <SetupChecklist
          profile={profile}
          measurementCount={measurements.length}
          withingsConnected={withingsConnected}
          onOpenProfile={onOpenProfile}
          onNavigateToSettings={onNavigateToSettings}
        />
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