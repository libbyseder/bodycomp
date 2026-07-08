import type { Profile } from '../types'

export function isProfileComplete(profile: Profile | null | undefined): boolean {
  if (!profile?.id) return false

  return (
    profile.height_inches != null &&
    profile.height_inches > 0 &&
    profile.gender != null &&
    profile.target_weight != null &&
    profile.target_weight > 0 &&
    profile.target_body_fat != null &&
    profile.target_body_fat > 0
  )
}

export function needsSetup(
  profile: Profile | null | undefined,
  measurementCount: number,
  profileLoading: boolean,
  measurementsLoading: boolean
): boolean {
  if (profileLoading || measurementsLoading) return false
  return !isProfileComplete(profile) || measurementCount === 0
}