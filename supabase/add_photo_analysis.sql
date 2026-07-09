-- Run in Supabase SQL Editor (after add_progress_photos.sql)

ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS analysis_json jsonb;
ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS analysis_status text
  CHECK (analysis_status IS NULL OR analysis_status IN ('pending', 'complete', 'failed'));
ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS analysis_error text;