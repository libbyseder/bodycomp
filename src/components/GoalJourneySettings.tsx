import { useState } from 'react'
import { Target } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Profile } from '../types'
import { getGoalStartDate } from '../lib/goalWindow'

function formatGoalStartDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface GoalJourneySettingsProps {
  profile: Profile | null
  onEditProfile: () => void
  onUpdate: () => void | Promise<void>
}

export default function GoalJourneySettings({
  profile,
  onEditProfile,
  onUpdate,
}: GoalJourneySettingsProps) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const goalStartDate = getGoalStartDate(profile)

  const handleToggleHide = async () => {
    if (!user || !goalStartDate) return

    setSaving(true)
    const nextValue = !profile?.hide_pre_goal_entries

    const { error } = await supabase
      .from('profiles')
      .update({ hide_pre_goal_entries: nextValue })
      .eq('id', user.id)

    setSaving(false)

    if (error) {
      toast.error('Failed to update goal journey setting')
      return
    }

    toast.success(nextValue ? 'Earlier entries hidden' : 'All entries shown')
    await onUpdate()
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-zinc-800 text-emerald-400">
          <Target size={20} />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-white">Goal journey</p>
          <p className="text-sm text-zinc-400 mt-0.5">
            {goalStartDate
              ? `Progress counts from ${formatGoalStartDate(goalStartDate)}.`
              : 'Set a goal start date to measure progress from a specific point.'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onEditProfile}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm text-zinc-200 transition-colors"
        >
          {goalStartDate ? 'Edit goal start date' : 'Set goal start date'}
        </button>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!profile?.hide_pre_goal_entries}
            disabled={!goalStartDate || saving}
            onChange={() => void handleToggleHide()}
            className="mt-1 rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500 disabled:opacity-50"
          />
          <span className="text-sm text-zinc-300 leading-snug">
            Hide entries before start date on charts and log
            {!goalStartDate && (
              <span className="block text-xs text-zinc-500 mt-1">
                Set a goal start date first.
              </span>
            )}
          </span>
        </label>
      </div>
    </div>
  )
}