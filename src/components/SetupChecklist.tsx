import { CheckCircle2, Circle } from 'lucide-react'
import { isProfileComplete } from '../lib/profileSetup'
import type { Profile } from '../types'

interface SetupChecklistProps {
  profile: Profile | null
  measurementCount: number
  withingsConnected: boolean
  onOpenProfile: () => void
  onNavigateToSettings: () => void
}

function StepRow({
  done,
  active,
  step,
  title,
  description,
  actionLabel,
  onAction,
}: {
  done: boolean
  active: boolean
  step: number
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}) {
  const Icon = done ? CheckCircle2 : Circle

  return (
    <div
      className={`flex gap-3 p-4 rounded-2xl border transition-colors ${
        active
          ? 'bg-cyan-500/10 border-cyan-500/40'
          : done
            ? 'bg-zinc-800/40 border-zinc-700/80'
            : 'bg-zinc-900/60 border-zinc-800 opacity-70'
      }`}
    >
      <Icon
        size={22}
        className={`shrink-0 mt-0.5 ${done ? 'text-emerald-400' : active ? 'text-cyan-400' : 'text-zinc-600'}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
          Step {step}
        </p>
        <p className={`font-medium ${active || done ? 'text-white' : 'text-zinc-400'}`}>{title}</p>
        <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{description}</p>
        {active && (
          <button
            type="button"
            onClick={onAction}
            className="mt-3 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {actionLabel} →
          </button>
        )}
      </div>
    </div>
  )
}

export default function SetupChecklist({
  profile,
  measurementCount,
  withingsConnected,
  onOpenProfile,
  onNavigateToSettings,
}: SetupChecklistProps) {
  const profileDone = isProfileComplete(profile)
  const dataDone = measurementCount > 0

  return (
    <section className="mb-6 p-5 bg-zinc-900 border border-zinc-700 rounded-3xl">
      <h2 className="text-lg font-semibold text-white">Get started</h2>
      <p className="text-sm text-zinc-400 mt-1 mb-4 leading-relaxed">
        Complete your profile and goals first, then bring in your scale data.
      </p>

      <div className="space-y-3">
        <StepRow
          step={1}
          done={profileDone}
          active={!profileDone}
          title="Profile & Goals"
          description="Set your height, gender, and target weight and body fat so charts and predictions work."
          actionLabel="Set up profile"
          onAction={onOpenProfile}
        />

        <StepRow
          step={2}
          done={dataDone}
          active={profileDone && !dataDone}
          title="Add your measurements"
          description={
            withingsConnected
              ? 'Your Withings scale is connected — sync in Settings to import history, or import a CSV.'
              : 'Connect your Withings scale for automatic sync, or import a CSV file with past measurements.'
          }
          actionLabel="Go to Settings"
          onAction={onNavigateToSettings}
        />
      </div>

      {profileDone && !dataDone && (
        <p className="text-xs text-zinc-500 mt-4 text-center">
          You can also tap <span className="text-zinc-400">+</span> on Home to log your first entry manually.
        </p>
      )}
    </section>
  )
}