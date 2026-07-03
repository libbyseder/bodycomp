import type { Measurement, Profile } from '../types'
import TrendsChart from './TrendsChart'
import SmoothedTrendsChart from './SmoothedTrendsChart'

interface TrendsTabProps {
  measurements: Measurement[]
  profile: Profile | null
}

export default function TrendsTab({ measurements, profile }: TrendsTabProps) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Trends</h1>
        <p className="text-zinc-400 mt-1 text-sm sm:text-base">
          Daily and smoothed views of your body composition
        </p>
      </div>

      <SmoothedTrendsChart
        measurements={measurements}
        profile={profile}
        className="mb-6 sm:mb-8"
      />
      <TrendsChart measurements={measurements} profile={profile} className="mb-0" />
    </div>
  )
}