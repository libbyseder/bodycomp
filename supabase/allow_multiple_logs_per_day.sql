-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)
-- Allows multiple measurements per calendar day (e.g. morning + evening weigh-ins)

ALTER TABLE measurements ADD COLUMN IF NOT EXISTS logged_at timestamptz;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS withings_grpid bigint;

-- Backfill logged_at for existing rows (noon UTC on the stored date)
UPDATE measurements
SET logged_at = (date::date + time '12:00:00') AT TIME ZONE 'UTC'
WHERE logged_at IS NULL;

ALTER TABLE measurements ALTER COLUMN logged_at SET DEFAULT now();

-- Remove the one-row-per-day limit (run the SELECT below first if this fails)
ALTER TABLE measurements DROP CONSTRAINT IF EXISTS measurements_user_id_date_key;

-- If the DROP above didn't work, find the real constraint name:
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'measurements'::regclass AND contype = 'u';

-- Prevent re-importing the same Withings reading on every sync
CREATE UNIQUE INDEX IF NOT EXISTS measurements_user_withings_grpid_unique
  ON measurements (user_id, withings_grpid)
  WHERE withings_grpid IS NOT NULL;