-- Run in Supabase SQL Editor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_start_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hide_pre_goal_entries boolean NOT NULL DEFAULT false;