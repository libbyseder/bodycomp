export interface Measurement {
  id: string
  user_id: string
  date: string
  weight: number
  body_fat: number | null
  height_inches: number | null
  gender: 'male' | 'female' | null
  created_at: string
}

export interface Profile {
  id?: string
  user_id: string
  name?: string | null
  height_inches?: number | null
  gender?: 'male' | 'female' | null
  target_weight?: number | null
  target_body_fat?: number | null      // ← Changed from target_bf
  target_ffmi?: number | null
  created_at?: string
  updated_at?: string
}
