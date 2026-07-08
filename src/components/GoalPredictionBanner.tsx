import type { Measurement, Profile } from '../types'
import { getGoalPredictions } from '../lib/goalPrediction'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface GoalPredictionBannerProps {
  measurements: Measurement[]
  profile: Profile | null
}

export default function GoalPredictionBanner({
  measurements,
  profile,
}: GoalPredictionBannerProps) {
  const predictions = getGoalPredictions(measurements, profile)

  if (predictions.length === 0) return null

  const onTrackPredictions = predictions.filter((p) => p.onTrack)
  const primary = onTrackPredictions[0] ?? predictions[0]
  const secondary = predictions.filter((p) => p.metric !== primary.metric)

  return (
    <div className="mb-6 p-4 sm:p-5 bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl">
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 p-2 rounded-xl ${
            primary.onTrack ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
          }`}
        >
          {primary.onTrack ? <TrendingDown size={18} /> : <Minus size={18} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">
            {primary.onTrack ? 'On track' : 'Trend check'}
          </p>
          <p className="text-sm text-zinc-400 mt-0.5">{primary.message}</p>
          {secondary.length > 0 && (
            <ul className="mt-3 space-y-1">
              {secondary.map((p) => (
                <li key={p.metric} className="text-xs text-zinc-500 flex items-center gap-1.5">
                  <TrendingUp size={12} className="shrink-0 text-zinc-600" />
                  {p.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}