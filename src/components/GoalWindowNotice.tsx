import type { Measurement, Profile } from '../types'
import { getGoalStartDate, goalStartDateLabel, isHidingPreGoalEntries } from '../lib/goalWindow'

interface GoalWindowNoticeProps {
  profile: Profile | null
  measurements?: Measurement[]
  className?: string
}

export default function GoalWindowNotice({
  profile,
  measurements = [],
  className = '',
}: GoalWindowNoticeProps) {
  if (!getGoalStartDate(profile)) return null

  const progressLabel = goalStartDateLabel(measurements, profile)
  if (!progressLabel) return null

  return (
    <p className={`text-xs text-zinc-500 ${className}`}>
      {isHidingPreGoalEntries(profile)
        ? `${progressLabel.replace('Goal progress counts from', 'Showing entries from')}.`
        : `${progressLabel}.`}
    </p>
  )
}