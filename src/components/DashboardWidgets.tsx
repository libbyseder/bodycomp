import { useProfile } from '../hooks/useProfile'
import type { Measurement } from '../types'

interface DashboardWidgetsProps {
  measurements: Measurement[]
}

export default function DashboardWidgets({ measurements }: DashboardWidgetsProps) {
  const { profile } = useProfile()

  if (measurements.length === 0) {
    return null
  }

  const latest = measurements[0]
  const currentWeight = latest.weight
  const currentBf = latest.body_fat ?? 0

  const currentLeanMass = latest.body_fat
    ? parseFloat((latest.weight * (1 - latest.body_fat / 100)).toFixed(1))
    : null

  // Calculate current FFMI
  const heightForCalc = latest.height_inches ?? profile?.height_inches ?? null
  const currentFfmi = heightForCalc && latest.body_fat
    ? parseFloat(
        ((latest.weight / 2.20462) * (1 - latest.body_fat / 100) / 
         Math.pow(heightForCalc * 0.0254, 2)).toFixed(2)
      )
    : null

  // Goals from Profile
  const weightGoal = profile?.target_weight
  const bfGoal = profile?.target_body_fat
  const ffmiGoal = profile?.target_ffmi

  // === Weight Progress (lower is better) ===
  let weightProgress = 0
  if (weightGoal && currentWeight > 0) {
    if (currentWeight <= weightGoal) {
      weightProgress = 100
    } else {
      weightProgress = Math.max(
        0,
        Math.min(100, 100 - ((currentWeight - weightGoal) / currentWeight) * 100)
      )
    }
  }

  // === Body Fat Progress (lower is better) ===
  let bfProgress = 0
  if (bfGoal && currentBf > 0) {
    if (currentBf <= bfGoal) {
      bfProgress = 100
    } else {
      bfProgress = Math.max(
        0,
        Math.min(100, 100 - ((currentBf - bfGoal) / currentBf) * 100)
      )
    }
  }

  // === FFMI Progress (higher is better) ===
  let ffmiProgress = 0
  if (ffmiGoal && currentFfmi) {
    if (currentFfmi >= ffmiGoal) {
      ffmiProgress = 100
    } else {
      ffmiProgress = Math.max(0, Math.min(100, (currentFfmi / ffmiGoal) * 100))
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Weight Widget */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-emerald-400 text-sm font-medium tracking-wider">WEIGHT</span>
          <span className="text-3xl font-semibold">{currentWeight}</span>
        </div>
        <div className="text-zinc-400 text-sm mb-4">lbs</div>

        {weightGoal && (
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Goal Progress</span>
              <span className="text-emerald-400">{Math.round(weightProgress)}% to goal</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${weightProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Body Fat Widget */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-orange-400 text-sm font-medium tracking-wider">BODY FAT</span>
          <span className="text-3xl font-semibold">{currentBf}</span>
        </div>
        <div className="text-zinc-400 text-sm mb-4">%</div>

        {bfGoal && (
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Goal Progress</span>
              <span className="text-orange-400">{Math.round(bfProgress)}% to goal</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all"
                style={{ width: `${bfProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* FFMI Widget */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-blue-400 text-sm font-medium tracking-wider">FFMI</span>
          <span className="text-3xl font-semibold">{currentFfmi ?? '—'}</span>
        </div>
        <div className="text-zinc-400 text-sm mb-4">score</div>

        {ffmiGoal && currentFfmi && (
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Goal Progress</span>
              <span className="text-blue-400">{Math.round(ffmiProgress)}% to goal</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
                style={{ width: `${ffmiProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Lean Mass Widget */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-teal-400 text-sm font-medium tracking-wider">LEAN MASS</span>
          <span className="text-3xl font-semibold">{currentLeanMass ?? '—'}</span>
        </div>
        <div className="text-zinc-400 text-sm">lbs</div>
      </div>
    </div>
  )
}
