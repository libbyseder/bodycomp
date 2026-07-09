import type { Profile } from '../types'
import { getGoalStartDate, isHidingPreGoalEntries } from '../lib/goalWindow'

function formatGoalStartDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface GoalWindowNoticeProps {
  profile: Profile | null
  className?: string
}

export default function GoalWindowNotice({ profile, className = '' }: GoalWindowNoticeProps) {
  const goalStartDate = getGoalStartDate(profile)
  if (!goalStartDate) return null

  const formattedDate = formatGoalStartDate(goalStartDate)

  return (
    <p className={`text-xs text-zinc-500 ${className}`}>
      {isHidingPreGoalEntries(profile)
        ? `Showing entries from ${formattedDate} onward.`
        : `Goal progress counts from ${formattedDate}.`}
    </p>
  )
}