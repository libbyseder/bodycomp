import { useMemo } from 'react'
import type { Measurement, Profile } from '../types'
import { calculateFFMI, calculateNormalizedFFMI, calculateLeanMassLbs } from '../lib/calculateFFMI'
import { measurementsForDisplay } from '../lib/goalWindow'
import { ChevronRight } from 'lucide-react'

interface MeasurementTimelineProps {
  measurements: Measurement[]
  profile: Profile | null
  limit?: number
  onViewAll?: () => void
}

export default function MeasurementTimeline({
  measurements,
  profile,
  limit = 5,
  onViewAll,
}: MeasurementTimelineProps) {
  const displayMeasurements = useMemo(
    () => measurementsForDisplay(measurements, profile),
    [measurements, profile]
  )
  const recent = displayMeasurements.slice(0, limit)

  if (recent.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-5 text-center text-zinc-400 text-sm">
        No measurements yet. Tap + to log your first entry.
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold">Recent</h2>
        {onViewAll && displayMeasurements.length > limit && (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View all
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {recent.map((m) => {
          const height = m.height_inches ?? profile?.height_inches
          const ffmi = height ? calculateFFMI(m.weight, m.body_fat, height) : null
          const normalizedFfmi = height ? calculateNormalizedFFMI(m.weight, m.body_fat, height) : null
          const leanMass = calculateLeanMassLbs(m.weight, m.body_fat)

          return (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-800/60 border border-zinc-700/80 rounded-2xl"
            >
              <div className="min-w-0">
                <p className="text-white font-medium text-sm">{m.date}</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {m.log_count ?? 1} log{(m.log_count ?? 1) === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 text-sm shrink-0">
                <div className="text-right">
                  <p className="text-emerald-400 font-medium">{m.weight}</p>
                  <p className="text-zinc-500 text-xs">lbs</p>
                </div>
                {m.body_fat != null && (
                  <div className="text-right hidden sm:block">
                    <p className="text-orange-400 font-medium">{m.body_fat}%</p>
                    <p className="text-zinc-500 text-xs">BF</p>
                  </div>
                )}
                {ffmi != null && (
                  <div className="text-right hidden sm:block">
                    <p className="text-blue-400 font-medium">{ffmi}</p>
                    <p className="text-zinc-500 text-xs">FFMI</p>
                  </div>
                )}
                {normalizedFfmi != null && (
                  <div className="text-right hidden md:block">
                    <p className="text-indigo-400 font-medium">{normalizedFfmi}</p>
                    <p className="text-zinc-500 text-xs">Norm.</p>
                  </div>
                )}
                {leanMass != null && (
                  <div className="text-right hidden md:block">
                    <p className="text-teal-400 font-medium">{leanMass}</p>
                    <p className="text-zinc-500 text-xs">lean</p>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {onViewAll && displayMeasurements.length > 0 && (
        <button
          type="button"
          onClick={onViewAll}
          className="w-full mt-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          See all {displayMeasurements.length} entries in Log
        </button>
      )}
    </div>
  )
}