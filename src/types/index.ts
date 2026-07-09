export interface Measurement {
  id: string
  user_id: string
  date: string
  logged_at?: string | null
  weight: number
  body_fat: number | null
  log_count?: number
  body_fat_log_count?: number
  height_inches: number | null
  gender: 'male' | 'female' | null
  created_at: string
}

export type ProgressPhotoPose = 'front' | 'side' | 'back' | 'other'

export interface ProgressPhoto {
  id: string
  user_id: string
  date: string
  pose: ProgressPhotoPose
  storage_path: string
  mime_type: string
  file_size_bytes: number | null
  created_at: string
}

export interface Profile {
  id?: string
  name?: string | null
  height_inches?: number | null
  gender?: 'male' | 'female' | null
  target_weight?: number | null
  target_body_fat?: number | null
  target_ffmi?: number | null
  target_normalized_ffmi?: number | null
  goal_start_date?: string | null
  hide_pre_goal_entries?: boolean | null
  created_at?: string
  updated_at?: string
}
