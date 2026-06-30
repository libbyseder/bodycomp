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

export interface Profile {
  id?: string
  name?: string | null
  height_inches?: number | null
  gender?: 'male' | 'female' | null
  target_weight?: number | null
  target_body_fat?: number | null
  target_ffmi?: number | null
  created_at?: string
  updated_at?: string
}
