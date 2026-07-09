export interface GoalPathVisibilitySettings {
  rawWeight: boolean
  weightTrend: boolean
  rawBodyFat: boolean
  bodyFatTrend: boolean
  rawFfmi: boolean
  ffmiTrend: boolean
  rawNormalizedFfmi: boolean
  normalizedFfmiTrend: boolean
  weightGoal: boolean
  bodyFatGoal: boolean
  ffmiGoal: boolean
  normalizedFfmiGoal: boolean
  photoMarkers: boolean
  aiBodyFatTrend: boolean
}

export const DEFAULT_GOAL_PATH_VISIBILITY: GoalPathVisibilitySettings = {
  rawWeight: false,
  weightTrend: true,
  rawBodyFat: false,
  bodyFatTrend: true,
  rawFfmi: false,
  ffmiTrend: false,
  rawNormalizedFfmi: false,
  normalizedFfmiTrend: true,
  weightGoal: true,
  bodyFatGoal: true,
  ffmiGoal: false,
  normalizedFfmiGoal: true,
  photoMarkers: true,
  aiBodyFatTrend: false,
}

const STORAGE_PREFIX = 'recomptrack-goal-path-visibility'

const VISIBILITY_KEYS = Object.keys(
  DEFAULT_GOAL_PATH_VISIBILITY
) as (keyof GoalPathVisibilitySettings)[]

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`
}

function isValidSettings(value: unknown): value is GoalPathVisibilitySettings {
  if (!value || typeof value !== 'object') return false
  return VISIBILITY_KEYS.every(
    (key) => typeof (value as GoalPathVisibilitySettings)[key] === 'boolean'
  )
}

export function loadGoalPathVisibility(
  userId: string | undefined
): GoalPathVisibilitySettings {
  if (!userId || typeof window === 'undefined') {
    return { ...DEFAULT_GOAL_PATH_VISIBILITY }
  }

  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { ...DEFAULT_GOAL_PATH_VISIBILITY }

    const parsed: unknown = JSON.parse(raw)
    if (!isValidSettings(parsed)) return { ...DEFAULT_GOAL_PATH_VISIBILITY }

    return { ...DEFAULT_GOAL_PATH_VISIBILITY, ...parsed }
  } catch {
    return { ...DEFAULT_GOAL_PATH_VISIBILITY }
  }
}

export function saveGoalPathVisibility(
  userId: string,
  settings: GoalPathVisibilitySettings
) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(settings))
  } catch {
    // Ignore quota / private browsing errors
  }
}