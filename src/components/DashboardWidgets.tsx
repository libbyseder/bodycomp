import type { Measurement, Profile } from '../types'
import {
  progressFromBaseline,
  progressTowardHigherGoal,
  progressTowardLowerGoal,
} from '../lib/goalProgress'
import { calculateFFMI, calculateNormalizedFFMI, calculateLeanMassLbs } from '../lib/calculateFFMI'

interface DashboardWidgetsProps {
  measurements: Measurement[]
  profile: Profile | null
}

export default function DashboardWidgets({ measurements, profile }: DashboardWidgetsProps) {

  if (measurements.length === 0) return null

  const earliest = measurements[measurements.length - 1]
  const latest = measurements[0]
  const currentWeight = latest.weight
  const currentBf = latest.body_fat ?? 0

  const currentLeanMass = calculateLeanMassLbs(latest.weight, latest.body_fat)

  const heightForCalc = latest.height_inches ?? profile?.height_inches ?? null
  const currentFfmi = heightForCalc
    ? calculateFFMI(latest.weight, latest.body_fat, heightForCalc)
    : null
  const currentNormalizedFfmi = heightForCalc
    ? calculateNormalizedFFMI(latest.weight, latest.body_fat, heightForCalc)
    : null
  const baselineFfmi = heightForCalc
    ? calculateFFMI(earliest.weight, earliest.body_fat, heightForCalc)
    : null
  const baselineNormalizedFfmi = heightForCalc
    ? calculateNormalizedFFMI(earliest.weight, earliest.body_fat, heightForCalc)
    : null

  // Support both old and new column names
  const weightGoal = profile?.target_weight
  const bfGoal = profile?.target_body_fat ?? (profile as any)?.target_bf
  const ffmiGoal = profile?.target_ffmi
  const normalizedFfmiGoal = profile?.target_normalized_ffmi

  const weightProgress = weightGoal
    ? progressFromBaseline(currentWeight, weightGoal, earliest.weight)
    : 0

  const bfProgress = bfGoal
    ? progressTowardLowerGoal(currentBf, bfGoal)
    : 0

  const ffmiProgress =
    ffmiGoal && currentFfmi && baselineFfmi != null
      ? progressFromBaseline(currentFfmi, ffmiGoal, baselineFfmi)
      : ffmiGoal && currentFfmi
        ? progressTowardHigherGoal(currentFfmi, ffmiGoal)
        : 0

  const normalizedFfmiProgress =
    normalizedFfmiGoal && currentNormalizedFfmi && baselineNormalizedFfmi != null
      ? progressFromBaseline(currentNormalizedFfmi, normalizedFfmiGoal, baselineNormalizedFfmi)
      : normalizedFfmiGoal && currentNormalizedFfmi
        ? progressTowardHigherGoal(currentNormalizedFfmi, normalizedFfmiGoal)
        : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {/* Weight */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-emerald-400 text-sm font-medium tracking-wider">WEIGHT</span>
          <span className="text-2xl sm:text-3xl font-semibold">{currentWeight}</span>
        </div>
        <div className="text-zinc-400 text-sm mb-4">lbs</div>
        {weightGoal && (
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Goal Progress</span>
              <span className="text-emerald-400">{Math.round(weightProgress)}% to goal</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all" style={{ width: `${weightProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Body Fat */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-orange-400 text-sm font-medium tracking-wider">BODY FAT</span>
          <span className="text-2xl sm:text-3xl font-semibold">{currentBf}</span>
        </div>
        <div className="text-zinc-400 text-sm mb-4">%</div>
        {bfGoal && (
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Goal Progress</span>
              <span className="text-orange-400">{Math.round(bfProgress)}% to goal</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all" style={{ width: `${bfProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* FFMI */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-blue-400 text-sm font-medium tracking-wider">FFMI</span>
          <span className="text-2xl sm:text-3xl font-semibold">{currentFfmi ?? '—'}</span>
        </div>
        <div className="text-zinc-400 text-sm mb-1">score</div>
        {currentNormalizedFfmi != null && (
          <p className="text-xs text-indigo-300/90 mb-1">
            Normalized {currentNormalizedFfmi}
          </p>
        )}
        {currentNormalizedFfmi == null && <div className="mb-1" />}
        {normalizedFfmiGoal && currentNormalizedFfmi != null && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Norm. goal</span>
              <span className="text-indigo-400">{Math.round(normalizedFfmiProgress)}% to goal</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full transition-all"
                style={{ width: `${normalizedFfmiProgress}%` }}
              />
            </div>
          </div>
        )}
        {!(normalizedFfmiGoal && currentNormalizedFfmi != null) && <div className="mb-3" />}
        {ffmiGoal && currentFfmi && (
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Goal Progress</span>
              <span className="text-blue-400">{Math.round(ffmiProgress)}% to goal</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all" style={{ width: `${ffmiProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Lean Mass */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-teal-400 text-sm font-medium tracking-wider">LEAN MASS</span>
          <span className="text-2xl sm:text-3xl font-semibold">{currentLeanMass ?? '—'}</span>
        </div>
        <div className="text-zinc-400 text-sm">lbs</div>
      </div>
    </div>
  )
}
